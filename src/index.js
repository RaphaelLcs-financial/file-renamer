#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { program } = require('commander');
const chalk = require('chalk');
const {
  regexReplace,
  getFileDate,
  formatDate,
  renameByDate,
  sortBySize,
  sortByDate,
  sortByName,
  resolveConflict,
  generateRenamePlan,
  exportRenamePlan
} = require('./advanced-rules.js');

// 获取目录下的文件
function getFiles(dir, options = {}) {
  const files = [];
  
  function traverse(currentPath) {
    const items = fs.readdirSync(currentPath);
    
    for (const item of items) {
      const fullPath = path.join(currentPath, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (options.recursive) {
          traverse(fullPath);
        }
      } else {
        const relativePath = path.relative(dir, fullPath);
        
        // 过滤
        if (options.extensions && options.extensions.length > 0) {
          const ext = path.extname(item).toLowerCase();
          if (!options.extensions.includes(ext)) {
            continue;
          }
        }
        
        files.push({
          name: item,
          path: fullPath,
          relativePath
        });
      }
    }
  }
  
  traverse(dir);
  return files;
}

// 重命名规则
function renameRule(filename, rule) {
  let result = filename;
  
  // 替换字符串
  if (rule.replace) {
    for (const [from, to] of Object.entries(rule.replace)) {
      result = result.replace(new RegExp(from, 'g'), to);
    }
  }
  
  // 前缀
  if (rule.prefix) {
    result = rule.prefix + result;
  }
  
  // 后缀
  if (rule.suffix) {
    const ext = path.extname(result);
    const name = path.basename(result, ext);
    result = name + rule.suffix + ext;
  }
  
  // 序号
  if (rule.sequence) {
    const { start, padding, template } = rule.sequence;
    const ext = path.extname(result);
    const name = path.basename(result, ext);
    const numStr = String(start).padStart(padding, '0');
    
    if (template) {
      result = template.replace('{n}', numStr).replace('{name}', name) + ext;
    } else {
      result = `${numStr}_${name}${ext}`;
    }
  }
  
  // 大小写转换
  if (rule.case) {
    switch (rule.case) {
      case 'upper':
        result = result.toUpperCase();
        break;
      case 'lower':
        result = result.toLowerCase();
        break;
      case 'title':
        result = result.replace(/\w\S*/g, txt => 
          txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
        break;
    }
  }
  
  return result;
}

// 批量重命名
function batchRename(files, rule, options) {
  const renamed = [];
  const errors = [];
  
  for (const file of files) {
    try {
      const newName = renameRule(file.name, rule);
      
      if (newName === file.name) {
        continue;
      }
      
      const newPath = path.join(path.dirname(file.path), newName);
      
      if (!options.dryRun) {
        fs.renameSync(file.path, newPath);
      }
      
      renamed.push({
        oldName: file.name,
        newName,
        oldPath: file.path,
        newPath
      });
    } catch (error) {
      errors.push({
        file: file.name,
        error: error.message
      });
    }
  }
  
  return { renamed, errors };
}

// 打印重命名结果
function printRenameResult(result, dryRun) {
  const { renamed, errors } = result;
  
  if (renamed.length === 0 && errors.length === 0) {
    console.log(chalk.yellow('\n⚠️  没有需要重命名的文件\n'));
    return { success: 0, failed: 0 };
  }
  
  console.log(chalk.cyan(`\n📋 重命名结果${dryRun ? ' (预览模式，不会实际重命名)' : ''}\n`));
  
  for (const item of renamed) {
    console.log(chalk.gray(`${item.oldName}`));
    console.log(chalk.green(`→ ${item.newName}`));
    console.log();
  }
  
  if (errors.length > 0) {
    console.log(chalk.red('❌ 错误:\n'));
    
    for (const error of errors) {
      console.log(chalk.red(`${error.file}: ${error.error}`));
    }
    
    console.log();
  }
  
  const summary = {
    success: renamed.length,
    failed: errors.length
  };
  
  console.log(chalk.cyan('📊 摘要\n'));
  console.log(chalk.gray(`成功: ${summary.success}`));
  console.log(chalk.gray(`失败: ${summary.failed}`));
  console.log();
  
  return summary;
}

// CLI 配置
program
  .name('file-renamer')
  .description('批量文件重命名工具 - 按规则批量重命名文件')
  .version('1.0.0');

program
  .command('rename <directory>')
  .option('-r, --replace <items>', '替换字符串（from:to,from2:to2）')
  .option('-p, --prefix <text>', '添加前缀')
  .option('-s, --suffix <text>', '添加后缀')
  .option('--sequence <start:padding:template>', '添加序号')
  .option('-c, --case <type>', '大小写转换（upper/lower/title）')
  .option('-e, --extensions <items>', '只处理指定扩展名（逗号分隔）')
  .option('-R, --recursive', '递归处理子目录')
  .option('-d, --dry-run', '预览模式，不实际重命名')
  .description('批量重命名文件')
  .action((directory, options) => {
    if (!fs.existsSync(directory)) {
      console.log(chalk.red(`目录不存在: ${directory}`));
      process.exit(1);
    }
    
    console.log(chalk.cyan(`\n🔧 批量重命名\n`));
    console.log(chalk.gray(`目录: ${directory}\n`));
    
    // 解析扩展名
    let extensions = [];
    if (options.extensions) {
      extensions = options.extensions.split(',').map(e => {
        if (!e.startsWith('.')) {
          return '.' + e;
        }
        return e.toLowerCase();
      });
    }
    
    // 解析序号规则
    let sequence = null;
    if (options.sequence) {
      const parts = options.sequence.split(':');
      const start = parseInt(parts[0]) || 1;
      const padding = parseInt(parts[1]) || 3;
      const template = parts[2] || '{n}_{name}';
      sequence = { start, padding, template };
    }
    
    // 解析替换规则
    let replace = {};
    if (options.replace) {
      for (const item of options.replace.split(',')) {
        const [from, to] = item.split(':');
        if (from && to) {
          replace[from] = to;
        }
      }
    }
    
    // 构建重命名规则
    const rule = {
      replace: Object.keys(replace).length > 0 ? replace : undefined,
      prefix: options.prefix,
      suffix: options.suffix,
      sequence,
      case: options.case
    };
    
    // 获取文件列表
    const files = getFiles(directory, {
      recursive: options.recursive,
      extensions: extensions.length > 0 ? extensions : undefined
    });
    
    if (files.length === 0) {
      console.log(chalk.yellow('⚠️  没有找到文件\n'));
      process.exit(0);
    }
    
    console.log(chalk.gray(`找到 ${files.length} 个文件\n`));
    
    // 批量重命名
    const result = batchRename(files, rule, { dryRun: options.dryRun });
    const summary = printRenameResult(result, options.dryRun);
    
    process.exit(summary.failed > 0 ? 1 : 0);
  });

program.parse();

// 导出重命名计划命令
program
  .command('export-plan <directory>')
  .option('-o, --output <path>', '输出文件路径')
  .option('-f, --format <type>', '输出格式（json/csv/txt）', 'json')
  .description('导出重命名计划')
  .action((directory, options) => {
    if (!fs.existsSync(directory)) {
      console.log(chalk.red(`目录不存在: ${directory}`));
      process.exit(1);
    }

    console.log(chalk.cyan(`\n📋 导出重命名计划\n`));
    console.log(chalk.gray(`目录: ${directory}\n`));

    // 获取文件
    const files = getFiles(directory);

    if (files.length === 0) {
      console.log(chalk.yellow('⚠️  没有找到文件\n'));
      process.exit(0);
    }

    console.log(chalk.gray(`找到 ${files.length} 个文件\n`));

    // 生成计划（使用默认规则）
    const plan = generateRenamePlan(files, {
      conflictStrategy: 'rename'
    });

    // 设置默认输出路径
    const defaultOutput = path.join(directory, 'rename-plan');
    const outputFile = options.output || `${defaultOutput}.${options.format}`;

    // 导出
    try {
      exportRenamePlan(plan, outputFile, options.format);
      console.log(chalk.green(`✓ 计划已导出到: ${outputFile}`));
      console.log();
    } catch (error) {
      console.log(chalk.red(`✗ 导出失败: ${error.message}`));
      process.exit(1);
    }
  });

// 按日期重命名命令
program
  .command('rename-date <directory>')
  .option('-f, --format <type>', '日期格式（YYYY-MM-DD, YYYYMMDD, etc.）', 'YYYY-MM-DD')
  .option('-t, --date-type <type>', '日期类型（create/modify/access）', 'modify')
  .option('-p, --position <pos>', '日期位置（prefix/suffix）', 'prefix')
  .option('-e, --extensions <items>', '只处理指定扩展名（逗号分隔）')
  .option('-R, --recursive', '递归处理子目录')
  .option('-d, --dry-run', '预览模式，不实际重命名')
  .description('基于文件日期重命名')
  .action((directory, options) => {
    if (!fs.existsSync(directory)) {
      console.log(chalk.red(`目录不存在: ${directory}`));
      process.exit(1);
    }

    console.log(chalk.cyan(`\n📅 按日期重命名\n`));
    console.log(chalk.gray(`目录: ${directory}`));
    console.log(chalk.gray(`日期格式: ${options.format}`));
    console.log(chalk.gray(`日期类型: ${options.dateType}`));
    console.log(chalk.gray(`日期位置: ${options.position}\n`));

    // 解析扩展名
    let extensions = [];
    if (options.extensions) {
      extensions = options.extensions.split(',').map(e => {
        if (!e.startsWith('.')) {
          return '.' + e;
        }
        return e.toLowerCase();
      });
    }

    // 获取文件并按日期排序
    const files = getFiles(directory, {
      recursive: options.recursive,
      extensions: extensions.length > 0 ? extensions : undefined
    });

    if (files.length === 0) {
      console.log(chalk.yellow('⚠️  没有找到文件\n'));
      process.exit(0);
    }

    // 按日期排序
    const sortedFiles = sortByDate(files, options.dateType);

    console.log(chalk.gray(`找到 ${sortedFiles.length} 个文件\n`));

    // 重命名
    const rule = {
      useDate: true,
      dateType: options.dateType,
      dateFormat: options.format,
      datePosition: options.position
    };

    const renamed = [];
    const errors = [];

    for (const file of sortedFiles) {
      try {
        const newName = renameByDate(file.name, file.path, rule);

        if (newName === file.name) {
          continue;
        }

        if (!options.dryRun) {
          const newPath = path.join(path.dirname(file.path), newName);
          fs.renameSync(file.path, newPath);
        }

        renamed.push({
          oldName: file.name,
          newName,
          date: getFileDate(file.path, options.dateType).toISOString()
        });
      } catch (error) {
        errors.push({
          file: file.name,
          error: error.message
        });
      }
    }

    // 打印结果
    console.log(chalk.cyan(`📋 重命名结果${options.dryRun ? ' (预览模式)' : ''}\n`));

    for (const rename of renamed) {
      console.log(chalk.gray(`${rename.oldName}`));
      console.log(chalk.gray(`  日期: ${rename.date.substring(0, 10)}`));
      console.log(chalk.green(`  → ${rename.newName}`));
      console.log();
    }

    if (errors.length > 0) {
      console.log(chalk.red('❌ 错误:\n'));

      for (const error of errors) {
        console.log(chalk.red(`${error.file}: ${error.error}`));
      }

      console.log();
    }

    // 摘要
    console.log(chalk.cyan('📊 摘要\n'));
    console.log(chalk.gray(`成功: ${renamed.length}`));
    console.log(chalk.red(`失败: ${errors.length}`));
    console.log();

    process.exit(errors.length > 0 ? 1 : 0);
  });

// 正则替换命令
program
  .command('regex-rename <directory>')
  .option('-p, --pattern <regex>', '正则表达式')
  .option('-r, --replacement <string>', '替换字符串')
  .option('-i, --ignore-case', '忽略大小写')
  .option('-g, --global', '全局替换（每次匹配都替换）')
  .option('-e, --extensions <items>', '只处理指定扩展名（逗号分隔）')
  .option('-R, --recursive', '递归处理子目录')
  .option('-d, --dry-run', '预览模式，不实际重命名')
  .description('使用正则表达式重命名')
  .action((directory, options) => {
    if (!options.pattern) {
      console.log(chalk.red('错误: 必须指定正则表达式 (--pattern)\n'));
      process.exit(1);
    }

    if (!options.replacement) {
      console.log(chalk.red('错误: 必须指定替换字符串 (--replacement)\n'));
      process.exit(1);
    }

    if (!fs.existsSync(directory)) {
      console.log(chalk.red(`目录不存在: ${directory}`));
      process.exit(1);
    }

    console.log(chalk.cyan(`\n🔍 正则替换\n`));
    console.log(chalk.gray(`目录: ${directory}`));
    console.log(chalk.gray(`模式: ${options.pattern}`));
    console.log(chalk.gray(`替换: ${options.replacement}\n`));

    // 解析扩展名
    let extensions = [];
    if (options.extensions) {
      extensions = options.extensions.split(',').map(e => {
        if (!e.startsWith('.')) {
          return '.' + e;
        }
        return e.toLowerCase();
      });
    }

    // 获取文件
    const files = getFiles(directory, {
      recursive: options.recursive,
      extensions: extensions.length > 0 ? extensions : undefined
    });

    if (files.length === 0) {
      console.log(chalk.yellow('⚠️  没有找到文件\n'));
      process.exit(0);
    }

    console.log(chalk.gray(`找到 ${files.length} 个文件\n`));

    // 构建正则表达式
    const flags = options.ignoreCase ? 'gi' : (options.global ? 'g' : '');
    const regex = new RegExp(options.pattern, flags);

    // 重命名
    const renamed = [];
    const errors = [];

    for (const file of files) {
      try {
        const newName = file.name.replace(regex, options.replacement);

        if (newName === file.name) {
          continue;
        }

        if (!options.dryRun) {
          const newPath = path.join(path.dirname(file.path), newName);
          fs.renameSync(file.path, newPath);
        }

        renamed.push({
          oldName: file.name,
          newName
        });
      } catch (error) {
        errors.push({
          file: file.name,
          error: error.message
        });
      }
    }

    // 打印结果
    console.log(chalk.cyan(`📋 重命名结果${options.dryRun ? ' (预览模式)' : ''}\n`));

    for (const rename of renamed) {
      console.log(chalk.gray(`${rename.oldName}`));
      console.log(chalk.green(`  → ${rename.newName}`));
      console.log();
    }

    if (errors.length > 0) {
      console.log(chalk.red('❌ 错误:\n'));

      for (const error of errors) {
        console.log(chalk.red(`${error.file}: ${error.error}`));
      }

      console.log();
    }

    // 摘要
    console.log(chalk.cyan('📊 摘要\n'));
    console.log(chalk.gray(`成功: ${renamed.length}`));
    console.log(chalk.red(`失败: ${errors.length}`));
    console.log();

    process.exit(errors.length > 0 ? 1 : 0);
  });

// 排序重命名命令
program
  .command('sort-rename <directory>')
  .option('-b, --by <type>', '排序依据（name/date/size）', 'name')
  .option('-o, --order <dir>', '排序方向（asc/desc）', 'asc')
  .option('-t, --date-type <type>', '日期类型（create/modify/access）', 'modify')
  .option('-c, --case <type>', '大小写转换（upper/lower/title）')
  .option('-e, --extensions <items>', '只处理指定扩展名（逗号分隔）')
  .option('-R, --recursive', '递归处理子目录')
  .option('-d, --dry-run', '预览模式，不实际重命名')
  .description('排序后重命名（按序号重命名）')
  .action((directory, options) => {
    if (!fs.existsSync(directory)) {
      console.log(chalk.red(`目录不存在: ${directory}`));
      process.exit(1);
    }

    console.log(chalk.cyan(`\n📊 排序重命名\n`));
    console.log(chalk.gray(`目录: ${directory}`));
    console.log(chalk.gray(`排序依据: ${options.by}`));
    console.log(chalk.gray(`排序方向: ${options.order}\n`));

    // 解析扩展名
    let extensions = [];
    if (options.extensions) {
      extensions = options.extensions.split(',').map(e => {
        if (!e.startsWith('.')) {
          return '.' + e;
        }
        return e.toLowerCase();
      });
    }

    // 获取文件
    const files = getFiles(directory, {
      recursive: options.recursive,
      extensions: extensions.length > 0 ? extensions : undefined
    });

    if (files.length === 0) {
      console.log(chalk.yellow('⚠️  没有找到文件\n'));
      process.exit(0);
    }

    console.log(chalk.gray(`找到 ${files.length} 个文件\n`));

    // 排序
    let sortedFiles;
    switch (options.by) {
      case 'name':
        sortedFiles = sortByName(files, options.order);
        break;
      case 'date':
        sortedFiles = sortByDate(files, options.dateType, options.order);
        break;
      case 'size':
        sortedFiles = sortBySize(files, options.order);
        break;
      default:
        console.log(chalk.red(`无效的排序依据: ${options.by}\n`));
        process.exit(1);
    }

    // 按序号重命名
    const renamed = [];
    const errors = [];

    for (let i = 0; i < sortedFiles.length; i++) {
      const file = sortedFiles[i];
      const ext = path.extname(file.name);
      const name = path.basename(file.name, ext);

      try {
        // 大小写转换
        let newName = name;
        if (options.case) {
          switch (options.case) {
            case 'upper':
              newName = name.toUpperCase();
              break;
            case 'lower':
              newName = name.toLowerCase();
              break;
            case 'title':
              newName = name.replace(/\w\S*/g, txt =>
                txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
              );
              break;
          }
        }

        // 添加序号
        const numStr = String(i + 1).padStart(String(sortedFiles.length).length, '0');
        newName = `${numStr}_${name}${ext}`;

        if (!options.dryRun) {
          const newPath = path.join(path.dirname(file.path), newName);
          fs.renameSync(file.path, newPath);
        }

        renamed.push({
          oldName: file.name,
          newName
        });
      } catch (error) {
        errors.push({
          file: file.name,
          error: error.message
        });
      }
    }

    // 打印结果
    console.log(chalk.cyan(`📋 重命名结果${options.dryRun ? ' (预览模式)' : ''}\n`));

    for (const rename of renamed) {
      console.log(chalk.gray(`${rename.oldName}`));
      console.log(chalk.green(`  → ${rename.newName}`));
      console.log();
    }

    if (errors.length > 0) {
      console.log(chalk.red('❌ 错误:\n'));

      for (const error of errors) {
        console.log(chalk.red(`${error.file}: ${error.error}`));
      }

      console.log();
    }

    // 摘要
    console.log(chalk.cyan('📊 摘要\n'));
    console.log(chalk.gray(`成功: ${renamed.length}`));
    console.log(chalk.red(`失败: ${errors.length}`));
    console.log();

    process.exit(errors.length > 0 ? 1 : 0);
  });

program.parse();
