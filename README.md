# @raphaellcs/file-renamer
[![npm](https://img.shields.io/npm/v/@raphaellcs/file-renamer)](https://www.npmjs.org/package/@raphaellcs/file-renamer)
[![downloads](https://img.shields.io/npm/dm/@raphaellcs/file-renamer)](https://www.npmjs.org/package/@raphaellcs/file-renamer)
[![license](https://img.shields.io/npm/l/@raphaellcs/file-renamer)](https://www.npmjs.org/package/@raphaellcs/file-renamer)
[![GitHub stars](https://img.shields.io/github/stars/RaphaelLcs-financial/file-renamer?style=social)](https://github.com/RaphaelLcs-financial/file-renamer/stargazers)
[![GitHub issues](https://img.shields.io/github/issues/RaphaelLcs-financial/file-renamer)](https://github.com/RaphaelLcs-financial/file-renamer/issues)

> 批量文件重命名工具 - 正则表达式、日期重命名、排序

## ⭐ 赞助

如果这个工具对你有帮助，请给个 Star ⭐️ 或者[赞助我](https://github.com/sponsors/RaphaelLcs-financial)！

## 🚀 功能

- **字符串替换**：替换文件名中的字符串
- **添加前缀/后缀**：为文件名添加前缀或后缀
- **序号命名**：按序号重命名文件
- **大小写转换**：转换文件名大小写
- **扩展名过滤**：只处理指定类型的文件
- **递归处理**：处理子目录中的文件
- **预览模式**：预览重命名结果
- **正则表达式替换**：使用正则表达式进行更灵活的替换（新）
- **日期重命名**：基于文件的修改时间/创建时间/访问时间重命名（新）
- **排序重命名**：按文件名、日期、大小排序后重命名（新）
- **导出重命名计划**：生成重命名计划文件，可导入/导出（新）

## 📦 安装

```bash
npx @claw-dev/file-renamer
```

## 📖 快速开始

### 1. 字符串替换

```bash
# 替换文件名中的 "old" 为 "new"
file-renamer rename . --replace "old:new"

# 多个替换
file-renamer rename . --replace "old:new,foo:bar"
```

### 2. 添加前缀

```bash
# 为所有文件添加前缀 "backup_"
file-renamer rename . --prefix "backup_"
```

### 3. 添加后缀

```bash
# 为所有文件添加后缀 "_v2"
file-renamer rename . --suffix "_v2"
```

### 4. 序号命名

```bash
# 按序号重命名：001_name.ext, 002_name.ext, ...
file-renamer rename . --sequence "1:3:{n}_{name}"

# 自定义模板
file-renamer rename . --sequence "1:2:photo_{n}"
```

### 5. 大小写转换

```bash
# 转换为大写
file-renamer rename . --case upper

# 转换为小写
file-renamer rename . --case lower

# 首字母大写
file-renamer rename . --case title
```

### 6. 组合使用

```bash
# 只处理图片文件，添加前缀和序号
file-renamer rename . -e ".jpg,.png,.jpeg" -p "IMG_" -s "1:4:{n}"
```

### 7. 预览模式

```bash
# 预览重命名结果，不实际执行
file-renamer rename . --replace "old:new" --dry-run
```

## 📋 选项

| 选项 | 说明 | 示例 |
|------|------|------|
| `-r, --replace <items>` | 替换字符串（from:to,from2:to2） | `"old:new,foo:bar"` |
| `-p, --prefix <text>` | 添加前缀 | `"backup_"` |
| `-s, --suffix <text>` | 添加后缀 | `"_v2"` |
| `--sequence <start:padding:template>` | 添加序号 | `"1:3:{n}_{name}"` |
| `-c, --case <type>` | 大小写转换（upper/lower/title） | `upper` |
| `-e, --extensions <items>` | 只处理指定扩展名 | `".jpg,.png"` |
| `-R, --recursive` | 递归处理子目录 | - |
| `-d, --dry-run` | 预览模式，不实际重命名 | - |

## 🎯 使用场景

### 1. 照片整理

```bash
# 重命名照片：IMG_001.jpg, IMG_002.jpg, ...
file-renamer rename photos/ -e ".jpg,.jpeg,.png" -p "IMG_" -s "1:4:{n}"
```

### 2. 备份标记

```bash
# 为备份文件添加标记
file-renamer rename backups/ --prefix "backup_" --suffix "_2026"
```

### 3. 格式统一

```bash
# 将所有文件名转换为小写
file-renamer rename . --case lower
```

### 4. 移除特殊字符

```bash
# 替换空格为下划线
file-renamer rename . --replace " :,_,-_"

# 替换多个特殊字符
file-renamer rename . --replace " :,_,-_,_:."
```

### 5. 版本标记

```bash
# 为所有文件添加版本后缀
file-renamer rename . --suffix "_v1"
```

### 6. 序号重命名

```bash
# 简单序号：001.ext, 002.ext, ...
file-renamer rename . --sequence "1:3:{n}_{name}"

# 自定义前缀：photo_001.jpg, photo_002.jpg, ...
file-renamer rename . --sequence "1:3:photo_{n}"
```

### 7. 按扩展名处理

```bash
# 只处理图片文件
file-renamer rename . -e ".jpg,.jpeg,.png,.gif"

# 只处理文档文件
file-renamer rename . -e ".pdf,.doc,.docx,.txt"
```

### 8. 预览和确认

```bash
# 预览重命名结果
file-renamer rename . --replace "old:new" --dry-run

# 确认无误后，去掉 --dry-run 执行
file-renamer rename . --replace "old:new"
```

## 💡 序号模板

序号模板支持以下占位符：

| 占位符 | 说明 |
|--------|------|
| `{n}` | 序号 |
| `{name}` | 原文件名（不含扩展名） |

### 示例

| 模板 | 结果 |
|------|------|
| `{n}_{name}` | `001_original.ext` |
| `{n}` | `001.ext` |
| `photo_{n}` | `photo_001.ext` |
| `img_{n}_{name}` | `img_001_original.ext` |

## ⚠️ 注意事项

### 1. 使用预览模式

第一次使用时，先使用 `--dry-run` 预览结果：

```bash
file-renamer rename . --replace "old:new" --dry-run
```

确认无误后，去掉 `--dry-run` 再执行。

### 2. 备份重要文件

批量重命名前，备份重要文件：

```bash
# 备份整个目录
cp -r important/ important_backup/

# 然后重命名
file-renamer rename important/ --replace "old:new"
```

### 3. 检查文件名冲突

如果有文件名冲突，会被跳过或报错。

### 4. 递归处理

使用 `-R` 选项会处理子目录中的文件，请确保这是你想要的。

```bash
# 只处理当前目录
file-renamer rename . --replace "old:new"

# 递归处理所有子目录
file-renamer rename . --replace "old:new" -R
```

## 🔧 实际案例

### 案例 1: 照片整理

```bash
# 原始文件：DSC0001.jpg, DSC0002.jpg, ...
# 目标：photo_001.jpg, photo_002.jpg, ...

file-renamer rename photos/ -e ".jpg" -s "1:4:photo_{n}"
```

### 案例 2: 备份标记

```bash
# 原始文件：data.csv, config.json, ...
# 目标：backup_data.csv, backup_config.json, ...

file-renamer rename . --prefix "backup_" --suffix "_2026-02-11"
```

### 案例 3: 格式统一

```bash
# 原始文件：MixedCase.File, OTHER_FILE, some_file
# 目标：mixedcase.file, other_file, some_file

file-renamer rename . --case lower
```

### 案例 4: 移除空格

```bash
# 原始文件：my file.txt, another file.jpg
# 目标：my_file.txt, another_file.jpg

file-renamer rename . --replace " :_"
```

### 案例 5: 版本更新

```bash
# 原始文件：app_v1.js, app_v2.js, ...
# 目标：app_v2.js, app_v3.js, ...

file-renamer rename . --replace "v1:v2"
```

## ✨ 新功能（v2.0.0）

### 正则表达式替换

使用正则表达式进行更灵活的替换：

```bash
# 去除文件名中的特殊字符
file-renamer regex-rename . -p "[^a-zA-Z0-9._-]" -r "_"

# 统一日期格式：2026-02-11 → 20260211
file-renamer regex-rename . -p "(\d{4})-(\d{2})-(\d{2})" -r "$1$2$3"

# 移除文件名中的版本号
file-renamer regex-rename . -p "_v\d+\.?\d*" -r ""
```

### 基于日期重命名

根据文件的修改时间/创建时间/访问时间重命名：

```bash
# 按修改日期重命名：2026-02-11_filename.ext
file-renamer rename-date . -f "YYYY-MM-DD" -t modify

# 按创建日期重命名：filename_20260211.ext
file-renamer rename-date . -f "YYYYMMDD" -t create -p suffix

# 按访问日期重命名，自定义格式
file-renamer rename-date . -f "YYYY-MM-DD_HH-mm" -t access
```

### 排序后重命名

按文件名、日期或大小排序后添加序号：

```bash
# 按文件名排序后重命名：001_aaa.txt, 002_bbb.txt, ...
file-renamer sort-rename . --by name

# 按修改日期排序后重命名（最新优先）
file-renamer sort-rename . --by date -o desc

# 按文件大小排序后重命名
file-renamer sort-rename . --by size
```

### 导出重命名计划

生成重命名计划文件：

```bash
# 导出 JSON 格式
file-renamer export-plan . -o plan.json -f json

# 导出 CSV 格式
file-renamer export-plan . -o plan.csv -f csv

# 导出 TXT 格式
file-renamer export-plan . -o plan.txt -f txt
```

JSON 格式示例：

```json
{
  "originalFiles": 10,
  "renamedFiles": 8,
  "skippedFiles": 2,
  "errorFiles": 0,
  "renames": [
    {
      "oldName": "old-file.txt",
      "newName": "new-file.txt",
      "oldPath": "/path/to/old-file.txt",
      "newPath": "/path/to/new-file.txt"
    }
  ],
  "errors": []
}
```

### 预览模式

所有命令都支持 `--dry-run` 选项，预览重命名结果而不实际执行：

```bash
# 预览正则替换
file-renamer regex-rename . -p "old" -r "new" -d

# 预览日期重命名
file-renamer rename-date . -d

# 预览排序重命名
file-renamer sort-rename . -d
```

## 🚧 待实现

- [ ] 撤销重命名
- [ ] 导入重命名计划
- [ ] 更高级的冲突解决

## 🤝 贡献

欢迎提交 Issue 和 PR！

## 📄 许可证

MIT © 梦心

---

Made with 🌙 by 梦心
