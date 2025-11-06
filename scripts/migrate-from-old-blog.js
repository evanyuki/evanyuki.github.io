/* 迁移脚本：从旧博客迁移文章到新博客 */

import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 配置路径
const OLD_BLOG_ROOT = path.resolve(__dirname, "../../Kilien.github.io")
const NEW_BLOG_ROOT = path.resolve(__dirname, "..")
const OLD_POSTS_DIR = path.join(OLD_BLOG_ROOT, "blog/p")
const OLD_RESOURCES_DIR = path.join(OLD_BLOG_ROOT, "blog/resources")
const NEW_POSTS_DIR = path.join(NEW_BLOG_ROOT, "src/content/posts")

// 验证路径是否存在
function validatePaths() {
  if (!fs.existsSync(OLD_POSTS_DIR)) {
    console.error(`错误: 旧博客文章目录不存在: ${OLD_POSTS_DIR}`)
    process.exit(1)
  }
  if (!fs.existsSync(NEW_POSTS_DIR)) {
    console.error(`错误: 新博客文章目录不存在: ${NEW_POSTS_DIR}`)
    process.exit(1)
  }
  console.log("✓ 路径验证通过")
}

// 解析 frontmatter
function parseFrontmatter(content) {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---/
  const match = content.match(frontmatterRegex)
  
  if (!match) {
    return { frontmatter: {}, body: content }
  }

  const frontmatterText = match[1]
  const body = content.slice(match[0].length).trim()
  
  const frontmatter = {}
  const lines = frontmatterText.split("\n")
  let currentKey = null
  let currentArray = []
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    
    // 处理数组项
    if (trimmedLine.startsWith("- ") && currentKey) {
      currentArray.push(trimmedLine.slice(2).trim())
      continue
    }
    
    // 如果之前在处理数组，现在遇到新的键
    if (currentKey && currentArray.length > 0) {
      frontmatter[currentKey] = currentArray
      currentArray = []
      currentKey = null
    }
    
    // 解析键值对
    const colonIndex = trimmedLine.indexOf(":")
    if (colonIndex > 0) {
      const key = trimmedLine.slice(0, colonIndex).trim()
      const value = trimmedLine.slice(colonIndex + 1).trim()
      
      if (value === "") {
        // 可能是数组的开始
        currentKey = key
        currentArray = []
      } else {
        frontmatter[key] = value
      }
    }
  }
  
  // 处理最后一个数组
  if (currentKey && currentArray.length > 0) {
    frontmatter[currentKey] = currentArray
  }
  
  return { frontmatter, body }
}

// 转换 frontmatter 格式
function transformFrontmatter(oldFrontmatter, body) {
  const newFrontmatter = {
    title: oldFrontmatter.title || "Untitled",
    published: oldFrontmatter.updated || oldFrontmatter.date || new Date().toISOString().split("T")[0],
    description: "",
    image: "",
    tags: [],
    category: "",
    draft: false
  }

  // 提取描述（从正文第一个有效段落）
  // 跳过标题、列表、代码块等，寻找真正的文本段落
  const lines = body.split('\n')
  let description = ''
  
  for (let i = 0; i < lines.length && !description; i++) {
    const line = lines[i].trim()
    
    // 跳过空行、标题、列表、代码块、引用等
    if (line && 
        !line.startsWith('#') && 
        !line.startsWith('*') && 
        !line.startsWith('-') && 
        !line.startsWith('>') && 
        !line.startsWith('```') && 
        !line.startsWith('!') && 
        line.length > 20) {
      description = line
      break
    }
  }
  
  if (description) {
    // 移除markdown语法并限制长度
    description = description
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // 移除链接
      .replace(/[*_`]/g, '') // 移除格式化符号
      .slice(0, 150)
    newFrontmatter.description = description
  }

  // 处理 headerImage -> image
  if (oldFrontmatter.headerImage) {
    newFrontmatter.image = oldFrontmatter.headerImage
  }

  // 处理 tags (从数组转换)
  if (oldFrontmatter.tags) {
    if (Array.isArray(oldFrontmatter.tags)) {
      newFrontmatter.tags = oldFrontmatter.tags
    } else if (typeof oldFrontmatter.tags === "string") {
      newFrontmatter.tags = [oldFrontmatter.tags]
    }
  }

  // 从tags中提取第一个作为category（如果没有单独的category）
  if (newFrontmatter.tags.length > 0) {
    newFrontmatter.category = newFrontmatter.tags[0]
  }

  return newFrontmatter
}

// 查找文章中引用的本地图片
function findLocalImages(body) {
  const images = []
  
  // 匹配 markdown 图片语法: ![alt](path)
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g
  let match
  
  while ((match = imageRegex.exec(body)) !== null) {
    const imagePath = match[2]
    
    // 检查是否是本地图片（不是http/https开头）
    if (!imagePath.startsWith("http://") && !imagePath.startsWith("https://")) {
      images.push({
        original: match[0],
        alt: match[1],
        path: imagePath
      })
    }
  }
  
  return images
}

// 复制图片文件
function copyImage(imagePath, postDirPath) {
  // 提取文件名
  const fileName = path.basename(imagePath)
  
  // 构建源路径 - 处理 ../resources/ 这样的相对路径
  let sourcePath
  
  if (imagePath.includes("../resources/") || imagePath.includes("..\\resources\\")) {
    // 从resources目录查找
    sourcePath = path.join(OLD_RESOURCES_DIR, fileName)
  } else {
    // 尝试在resources目录查找
    sourcePath = path.join(OLD_RESOURCES_DIR, fileName)
    
    // 如果不存在，尝试绝对路径或相对于OLD_POSTS_DIR的路径
    if (!fs.existsSync(sourcePath)) {
      sourcePath = path.join(OLD_POSTS_DIR, imagePath)
    }
  }
  
  // 如果还是找不到
  if (!fs.existsSync(sourcePath)) {
    console.warn(`  ⚠ 找不到图片: ${imagePath}`)
    return null
  }
  
  // 目标路径
  const targetPath = path.join(postDirPath, fileName)
  
  try {
    fs.copyFileSync(sourcePath, targetPath)
    console.log(`  ✓ 复制图片: ${fileName}`)
    return fileName
  } catch (error) {
    console.warn(`  ⚠ 复制图片失败: ${fileName} - ${error.message}`)
    return null
  }
}

// 更新文章中的图片路径
function updateImagePaths(body, images, postDirPath) {
  let updatedBody = body
  
  for (const image of images) {
    const newFileName = copyImage(image.path, postDirPath)
    if (newFileName) {
      // 更新为相对路径
      const newImageMd = `![${image.alt}](./${newFileName})`
      updatedBody = updatedBody.replace(image.original, newImageMd)
    }
  }
  
  return updatedBody
}

// 生成新的 frontmatter 字符串
function generateFrontmatter(frontmatter) {
  const lines = ["---"]
  
  lines.push(`title: ${frontmatter.title}`)
  lines.push(`published: ${frontmatter.published}`)
  lines.push(`description: '${frontmatter.description.replace(/'/g, "\\'")}'`)
  lines.push(`image: '${frontmatter.image}'`)
  
  // tags 使用 JSON 数组格式
  const tagsStr = JSON.stringify(frontmatter.tags)
  lines.push(`tags: ${tagsStr}`)
  
  lines.push(`category: '${frontmatter.category}'`)
  lines.push(`draft: ${frontmatter.draft}`)
  lines.push("---")
  
  return lines.join("\n")
}

// 迁移单个文件
function migratePost(fileName) {
  console.log(`\n处理: ${fileName}`)
  
  const oldFilePath = path.join(OLD_POSTS_DIR, fileName)
  const content = fs.readFileSync(oldFilePath, "utf-8")
  
  // 解析旧的 frontmatter
  const { frontmatter: oldFrontmatter, body } = parseFrontmatter(content)
  
  // 转换 frontmatter
  const newFrontmatter = transformFrontmatter(oldFrontmatter, body)
  
  // 创建文章目录（使用文章的ID或标题）
  const postId = path.basename(fileName, ".md")
  const postDirPath = path.join(NEW_POSTS_DIR, postId)
  
  if (!fs.existsSync(postDirPath)) {
    fs.mkdirSync(postDirPath, { recursive: true })
  }
  
  // 查找并处理图片
  const localImages = findLocalImages(body)
  let updatedBody = body
  
  if (localImages.length > 0) {
    console.log(`  发现 ${localImages.length} 个本地图片`)
    updatedBody = updateImagePaths(body, localImages, postDirPath)
  }
  
  // 生成新文件内容
  const newContent = generateFrontmatter(newFrontmatter) + "\n\n" + updatedBody
  
  // 写入新文件
  const newFilePath = path.join(postDirPath, "index.md")
  fs.writeFileSync(newFilePath, newContent, "utf-8")
  
  console.log(`  ✓ 迁移完成: ${postId}/index.md`)
  
  return { success: true, fileName, postId }
}

// 主函数
function main() {
  console.log("=" .repeat(60))
  console.log("开始迁移文章从旧博客到新博客")
  console.log("=" .repeat(60))
  
  validatePaths()
  
  // 读取所有markdown文件
  const files = fs.readdirSync(OLD_POSTS_DIR).filter(f => f.endsWith(".md"))
  
  console.log(`\n找到 ${files.length} 篇文章待迁移`)
  
  const results = {
    success: [],
    failed: []
  }
  
  // 迁移每篇文章
  for (const fileName of files) {
    try {
      const result = migratePost(fileName)
      results.success.push(result)
    } catch (error) {
      console.error(`  ✗ 迁移失败: ${fileName}`)
      console.error(`    错误: ${error.message}`)
      results.failed.push({ fileName, error: error.message })
    }
  }
  
  // 输出统计
  console.log("\n" + "=" .repeat(60))
  console.log("迁移完成统计")
  console.log("=" .repeat(60))
  console.log(`成功: ${results.success.length} 篇`)
  console.log(`失败: ${results.failed.length} 篇`)
  
  if (results.failed.length > 0) {
    console.log("\n失败的文章:")
    results.failed.forEach(({ fileName, error }) => {
      console.log(`  - ${fileName}: ${error}`)
    })
  }
  
  console.log("\n✓ 迁移流程结束")
}

// 运行
main()

