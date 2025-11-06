/* This is a script to create a new post markdown file with front-matter */

import fs from "fs"
import path from "path"
import crypto from "crypto"

function getDate() {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, "0")
  const day = String(today.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

const args = process.argv.slice(2)

if (args.length === 0) {
  console.error(`Error: No title argument provided
Usage: npm run new-post -- <post-title>`)
  process.exit(1) // Terminate the script and return error code 1
}

const title = args[0]

// Generate unique seed using UUID without hyphens
const seed = crypto.randomUUID().replace(/-/g, '')

const targetDir = "./src/content/posts/"
const postDir = path.join(targetDir, seed)
const fullPath = path.join(postDir, "index.md")

// Check if directory already exists (very unlikely with UUID)
if (fs.existsSync(postDir)) {
  console.error(`Error: Directory ${postDir} already exists`)
  process.exit(1)
}

// Create post directory
fs.mkdirSync(postDir, { recursive: true })

// Generate image URL with seed
const imageUrl = `https://picsum.photos/seed/${seed}/1920/1080`

const content = `---
title: ${title}
published: ${getDate()}
description: ''
image: '${imageUrl}'
tags: []
category: ''
draft: false
---
`

fs.writeFileSync(fullPath, content)

console.log(`Post created successfully!`)
console.log(`- File: ${fullPath}`)
console.log(`- Seed: ${seed}`)
console.log(`- Image URL: ${imageUrl}`)
