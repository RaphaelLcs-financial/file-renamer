#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { program } = require('commander');
const chalk = require('chalk');

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
