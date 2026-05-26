const { Client } = require("@notionhq/client");
const { NotionToMarkdown } = require("notion-to-md");
const fs = require("fs");
const path = require("path");

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const n2m = new NotionToMarkdown({ notionClient: notion });

async function main() {
  const databaseId = process.env.NOTION_DATABASE_ID;

  const response = await notion.databases.query({
    database_id: databaseId,
    filter: {
      property: "Published",
      checkbox: { equals: true },
    },
  });

  const postsDir = path.join(__dirname, "../content/posts");
  if (!fs.existsSync(postsDir)) {
    fs.mkdirSync(postsDir, { recursive: true });
  }

  for (const page of response.results) {
    const title = page.properties["이름"]?.title[0]?.plain_text || 
                  page.properties["Name"]?.title[0]?.plain_text || "Untitled";
    const date = page.properties.Date?.date?.start || 
                 new Date().toISOString().split("T")[0];
    const tags = page.properties.Tags?.multi_select?.map((t) => t.name) || [];
    const slug = page.properties.Slug?.rich_text[0]?.plain_text || page.id;

    const mdBlocks = await n2m.pageToMarkdown(page.id);
    const mdContent = n2m.toMarkdownString(mdBlocks);

    const frontmatter = `---
title: "${title}"
date: ${date}
draft: false
tags: [${tags.map((t) => `"${t}"`).join(", ")}]
---

`;
    const content = frontmatter + mdContent.parent;
    const filePath = path.join(postsDir, `${slug}.md`);
    fs.writeFileSync(filePath, content);
    console.log(`✅ ${title} → ${slug}.md`);
  }
}

main().catch(console.error);
