// 高级重命名规则模块

/**
 * 正则表达式替换
 * @param {string} filename - 文件名
 * @param {Object} patterns - 正则模式映射 { pattern: replacement }
 * @returns {string} 新文件名
 */
function regexReplace(filename, patterns) {
  let result = filename;

  for (const [pattern, replacement] of Object.entries(patterns)) {
    try {
      const regex = new RegExp(pattern, 'g');
      result = result.replace(regex, replacement);
    } catch (error) {
      console.warn(`无效的正则表达式: ${pattern} - ${error.message}`);
    }
  }

  return result;
}

/**
 * 获取文件日期
 * @param {string} filePath - 文件路径
 * @param {string} dateType - 日期类型（modify/ create/access）
 * @returns {Date} 文件日期
 */
function getFileDate(filePath, dateType = 'modify') {
  const stats = require('fs').statSync(filePath);

  switch (dateType) {
    case 'create':
      return stats.birthtime || stats.mtime;
    case 'access':
      return stats.atime;
    case 'modify':
    default:
      return stats.mtime;
  }
}

/**
 * 格式化日期为字符串
 * @param {Date} date - 日期对象
 * @param {string} format - 格式字符串（YYYY-MM-DD, YYYYMMDD, etc.）
 * @returns {string} 格式化后的日期字符串
 */
function formatDate(date, format = 'YYYY-MM-DD') {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');

  return format
    .replace('YYYY', year)
    .replace('YY', String(year).slice(-2))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hour)
    .replace('mm', minute)
    .replace('ss', second);
}

/**
 * 基于日期重命名
 * @param {string} filename - 原始文件名
 * @param {string} filePath - 文件路径
 * @param {Object} options - 选项
 * @returns {string} 新文件名
 */
function renameByDate(filename, filePath, options) {
  const {
    dateType = 'modify',
    format = 'YYYY-MM-DD',
    position = 'prefix', // prefix | suffix
    separator = '_'
  } = options;

  const date = getFileDate(filePath, dateType);
  const dateStr = formatDate(date, format);
  const ext = require('path').extname(filename);
  const name = require('path').basename(filename, ext);

  switch (position) {
    case 'prefix':
      return `${dateStr}${separator}${name}${ext}`;
    case 'suffix':
      return `${name}${separator}${dateStr}${ext}`;
    default:
      return `${dateStr}${separator}${name}${ext}`;
  }
}

/**
 * 按文件大小排序
 * @param {Array} files - 文件列表
 * @param {string} order - 排序顺序（asc/desc）
 * @returns {Array} 排序后的文件列表
 */
function sortBySize(files, order = 'asc') {
  return files.sort((a, b) => {
    const sizeA = require('fs').statSync(a.path).size;
    const sizeB = require('fs').statSync(b.path).size;

    return order === 'asc' ? sizeA - sizeB : sizeB - sizeA;
  });
}

/**
 * 按文件日期排序
 * @param {Array} files - 文件列表
 * @param {string} dateType - 日期类型
 * @param {string} order - 排序顺序（asc/desc）
 * @returns {Array} 排序后的文件列表
 */
function sortByDate(files, dateType = 'modify', order = 'asc') {
  return files.sort((a, b) => {
    const dateA = getFileDate(a.path, dateType);
    const dateB = getFileDate(b.path, dateType);

    return order === 'asc' ? dateA - dateB : dateB - dateA;
  });
}

/**
 * 按文件名排序
 * @param {Array} files - 文件列表
 * @param {string} order - 排序顺序（asc/desc）
 * @returns {Array} 排序后的文件列表
 */
function sortByName(files, order = 'asc') {
  return files.sort((a, b) => {
    const nameA = a.name.toLowerCase();
    const nameB = b.name.toLowerCase();

    if (order === 'asc') {
      return nameA.localeCompare(nameB);
    } else {
      return nameB.localeCompare(nameA);
    }
  });
}

/**
 * 智能去重 - 检测并处理文件名冲突
 * @param {string} filename - 文件名
 * @param {Set} existingNames - 已存在的文件名集合
 * @param {string} strategy - 冲突处理策略（rename/skip/overwrite）
 * @returns {Object} { filename, conflict, resolved }
 */
function resolveConflict(filename, existingNames, strategy = 'rename') {
  if (!existingNames.has(filename)) {
    return { filename, conflict: false, resolved: true };
  }

  if (strategy === 'skip') {
    return { filename, conflict: true, resolved: false };
  }

  if (strategy === 'overwrite') {
    return { filename, conflict: true, resolved: true };
  }

  // 默认：rename - 在文件名后添加数字
  const path = require('path');
  const ext = path.extname(filename);
  const name = path.basename(filename, ext);
  let counter = 1;
  let newFilename;

  do {
    newFilename = `${name}_${counter}${ext}`;
    counter++;
  } while (existingNames.has(newFilename));

  return { filename: newFilename, conflict: true, resolved: true };
}

/**
 * 生成重命名计划
 * @param {Array} files - 文件列表
 * @param {Object} options - 重命名选项
 * @returns {Object} 重命名计划
 */
function generateRenamePlan(files, options) {
  const plan = {
    originalFiles: files.length,
    renamedFiles: 0,
    skippedFiles: 0,
    errorFiles: 0,
    renames: [],
    errors: []
  };

  const existingNames = new Set();

  for (const file of files) {
    try {
      let newName = file.name;

      // 基于日期重命名
      if (options.useDate) {
        newName = renameByDate(file.name, file.path, {
          dateType: options.dateType,
          format: options.dateFormat,
          position: options.datePosition
        });
      }

      // 正则替换
      if (options.regexReplace) {
        newName = regexReplace(newName, options.regexReplace);
      }

      // 解决冲突
      const resolution = resolveConflict(newName, existingNames, options.conflictStrategy);

      if (!resolution.resolved) {
        plan.skippedFiles++;
        continue;
      }

      if (resolution.filename !== file.name) {
        plan.renamedFiles++;
        plan.renames.push({
          oldName: file.name,
          newName: resolution.filename,
          oldPath: file.path,
          newPath: require('path').join(require('path').dirname(file.path), resolution.filename)
        });

        existingNames.add(resolution.filename);
      }
    } catch (error) {
      plan.errorFiles++;
      plan.errors.push({
        file: file.name,
        error: error.message
      });
    }
  }

  return plan;
}

/**
 * 导出重命名计划
 * @param {Object} plan - 重命名计划
 * @param {string} filePath - 输出文件路径
 * @param {string} format - 输出格式（json/csv/txt）
 */
function exportRenamePlan(plan, filePath, format = 'json') {
  const fs = require('fs');
  const path = require('path');

  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  let content;

  switch (format.toLowerCase()) {
    case 'json':
      content = JSON.stringify(plan, null, 2);
      break;

    case 'csv':
      const headers = ['oldName', 'newName', 'oldPath', 'newPath'];
      const rows = plan.renames.map(r => [
        `"${r.oldName}"`,
        `"${r.newName}"`,
        `"${r.oldPath}"`,
        `"${r.newPath}"`
      ]);
      content = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      break;

    case 'txt':
      content = `重命名计划\n${'='.repeat(50)}\n\n`;
      content += `原始文件: ${plan.originalFiles}\n`;
      content += `重命名文件: ${plan.renamedFiles}\n`;
      content += `跳过文件: ${plan.skippedFiles}\n`;
      content += `错误文件: ${plan.errorFiles}\n\n`;
      content += `${'='.repeat(50)}\n\n`;

      for (const rename of plan.renames) {
        content += `${rename.oldName} → ${rename.newName}\n`;
      }

      if (plan.errors.length > 0) {
        content += `\n${'='.repeat(50)}\n\n错误:\n\n`;
        for (const error of plan.errors) {
          content += `${error.file}: ${error.error}\n`;
        }
      }
      break;

    default:
      throw new Error(`不支持的格式: ${format}`);
  }

  fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * 导入重命名计划
 * @param {string} filePath - 文件路径
 * @returns {Object} 重命名计划
 */
function importRenamePlan(filePath) {
  const fs = require('fs');

  const content = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(content);
}

module.exports = {
  regexReplace,
  getFileDate,
  formatDate,
  renameByDate,
  sortBySize,
  sortByDate,
  sortByName,
  resolveConflict,
  generateRenamePlan,
  exportRenamePlan,
  importRenamePlan
};
