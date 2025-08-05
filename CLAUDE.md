# Quipu CMS Development Plan

## Architecture Overview

**Core Stack:**
- Backend: Quipubase (OpenAI-compatible API + Real-time objects + Vector embeddings + File storage)
- Frontend: Vue 3 + TypeScript + shadcn/vue + Tailwind CSS
- Real-time: Server-sent events via Quipubase Objects API
- Storage: Quipubase Collections (schema-based) + Blobs (media)

## Phase 1: Core Models & Data Layer (Week 1-2)

### 1.1 Content Models
```typescript
// models/Post.ts
export class Post extends BaseModel<typeof PostSchema> {
  static schema = z.object({
    id: z.string().uuid(),
    title: z.string(),
    slug: z.string(),
    content: z.any(), // Elementor-style blocks
    status: z.enum(['draft', 'published', 'private']),
    author_id: z.string(),
    featured_image: z.string().url().optional(),
    meta: z.record(z.string(), z.any()).optional(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime()
  })
}

// models/Page.ts
export class Page extends BaseModel<typeof PageSchema> {
  static schema = z.object({
    id: z.string().uuid(),
    title: z.string(),
    slug: z.string(),
    content: z.any(), // Page builder blocks
    template: z.string().default('default'),
    parent_id: z.string().optional(),
    menu_order: z.number().default(0),
    status: z.enum(['draft', 'published', 'private']),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime()
  })
}

// models/User.ts
export class User extends BaseModel<typeof UserSchema> {
  static schema = z.object({
    id: z.string().uuid(),
    username: z.string(),
    email: z.string().email(),
    role: z.enum(['admin', 'editor', 'author', 'contributor']),
    display_name: z.string(),
    avatar: z.string().url().optional(),
    created_at: z.string().datetime()
  })
}

// models/Media.ts
export class Media extends BaseModel<typeof MediaSchema> {
  static schema = z.object({
    id: z.string().uuid(),
    filename: z.string(),
    url: z.string().url(),
    alt_text: z.string().optional(),
    caption: z.string().optional(),
    mime_type: z.string(),
    size: z.number(),
    width: z.number().optional(),
    height: z.number().optional(),
    uploaded_by: z.string(),
    created_at: z.string().datetime()
  })
}
```

### 1.2 Content Store
```typescript
// stores/content.ts
export const useContentStore = defineStore('content', {
  state: () => ({
    posts: [] as Post[],
    pages: [] as Page[],
    media: [] as Media[],
    currentPost: null as Post | null,
    currentPage: null as Page | null
  }),
  
  actions: {
    async loadPosts() {
      const posts = await Post.query({})
      this.posts = posts.map(p => new Post(p))
    },
    
    async savePost(postData: any) {
      const post = new Post(postData)
      await post.upsert()
      await this.loadPosts()
    }
  }
})
```

## Phase 2: Page Builder Core (Week 3-4)

### 2.1 Block System Architecture
```typescript
// types/blocks.ts
export interface Block {
  id: string
  type: string
  content: Record<string, any>
  settings: Record<string, any>
  children?: Block[]
}

export interface BlockDefinition {
  name: string
  title: string
  icon: string
  category: string
  attributes: Record<string, any>
  render: Component
  edit: Component
}
```

### 2.2 Core Blocks
- **Layout Blocks**: Section, Column, Container
- **Content Blocks**: Heading, Text, Image, Video, Button
- **Advanced Blocks**: Gallery, Slider, Form, Map
- **Widget Blocks**: Recent Posts, Categories, Search

### 2.3 Block Registry
```typescript
// composables/useBlockRegistry.ts
export const useBlockRegistry = () => {
  const blocks = new Map<string, BlockDefinition>()
  
  const registerBlock = (definition: BlockDefinition) => {
    blocks.set(definition.name, definition)
  }
  
  const getBlock = (name: string) => blocks.get(name)
  
  return { registerBlock, getBlock, blocks }
}
```

## Phase 3: Visual Editor (Week 5-6)

### 3.1 Drag & Drop System
- Vue.Draggable for block manipulation
- Real-time preview updates
- Undo/redo system
- Copy/paste blocks

### 3.2 Inspector Panel
- Block-specific settings
- Typography controls
- Spacing/layout controls
- Color picker
- Media library integration

### 3.3 Device Preview
- Desktop/tablet/mobile views
- Responsive design controls
- Real-time preview switching

## Phase 4: Media Library (Week 7)

### 4.1 File Upload
```typescript
// composables/useMediaLibrary.ts
export const useMediaLibrary = () => {
  const quipu = useQuipubase()
  
  const uploadFile = async (file: File) => {
    const result = await quipu.blobs.create({
      path: `media/${Date.now()}-${file.name}`,
      file
    })
    
    const media = new Media({
      id: crypto.randomUUID(),
      filename: file.name,
      url: result.data.url,
      mime_type: file.type,
      size: file.size,
      uploaded_by: 'current-user-id',
      created_at: new Date().toISOString()
    })
    
    await media.upsert()
    return media
  }
  
  return { uploadFile }
}
```

### 4.2 Media Browser
- Grid/list view toggle
- Search and filter
- Bulk actions
- Image editing (crop, resize)

## Phase 5: Admin Dashboard (Week 8-9)

### 5.1 Dashboard Layout
```vue
<!-- layouts/AdminLayout.vue -->
<template>
  <div class="min-h-screen bg-background">
    <AdminSidebar />
    <div class="ml-64">
      <AdminHeader />
      <main class="p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>
```

### 5.2 Admin Routes
- `/admin/dashboard` - Overview stats
- `/admin/posts` - Posts management
- `/admin/pages` - Pages management
- `/admin/media` - Media library
- `/admin/users` - User management
- `/admin/settings` - Site settings

### 5.3 Real-time Updates
```typescript
// Real-time content updates
Post.subscribe(({ event, data }) => {
  const store = useContentStore()
  
  switch (event) {
    case 'create':
      store.posts.push(new Post(data))
      break
    case 'update':
      const index = store.posts.findIndex(p => p.id === data.id)
      if (index !== -1) store.posts[index] = new Post(data)
      break
    case 'delete':
      store.posts = store.posts.filter(p => p.id !== data.id)
      break
  }
})
```

## Phase 6: Frontend Theme System (Week 10)

### 6.1 Theme Structure
```typescript
// types/theme.ts
export interface Theme {
  name: string
  version: string
  templates: Record<string, Component>
  styles: string
  settings: Record<string, any>
}
```

### 6.2 Block Rendering
```vue
<!-- components/BlockRenderer.vue -->
<template>
  <component
    :is="blockComponent"
    :content="block.content"
    :settings="block.settings"
  />
</template>
```

## Phase 7: Advanced Features (Week 11-12)

### 7.1 Search Integration
```typescript
// Use Quipubase vector search for content
const searchContent = async (query: string) => {
  return await quipu.vector.query({
    namespace: 'content',
    input: query,
    top_k: 10,
    model: 'gemini-embedding-001'
  })
}
```

### 7.2 Version Control
- Auto-save drafts
- Revision history
- Compare versions
- Restore functionality

### 7.3 SEO Tools
- Meta tag management
- Open Graph integration
- XML sitemap generation
- Schema markup

## Technical Implementation Priority

1. **Setup Quipubase client in Vue app**
2. **Create base models with Zod schemas**
3. **Build content management stores**
4. **Implement basic CRUD operations**
5. **Create block system foundation**
6. **Build visual editor interface**
7. **Add drag & drop functionality**
8. **Implement media management**
9. **Create admin dashboard**
10. **Build frontend rendering**
11. **Add real-time collaboration**
12. **Implement advanced features**

## Key Files to Create

```
src/
├── models/
│   ├── Post.ts
│   ├── Page.ts
│   ├── User.ts
│   └── Media.ts
├── stores/
│   ├── content.ts
│   ├── auth.ts
│   └── media.ts
├── components/
│   ├── editor/
│   │   ├── BlockEditor.vue
│   │   ├── BlockInspector.vue
│   │   └── BlockRenderer.vue
│   ├── blocks/
│   │   ├── HeadingBlock.vue
│   │   ├── TextBlock.vue
│   │   └── ImageBlock.vue
│   └── admin/
│       ├── AdminSidebar.vue
│       └── AdminHeader.vue
├── pages/
│   ├── admin/
│   │   ├── dashboard.vue
│   │   ├── posts/
│   │   └── pages/
│   └── [...slug].vue
├── composables/
│   ├── useQuipubase.ts
│   ├── useBlockRegistry.ts
│   └── useMediaLibrary.ts
└── plugins/
    └── quipubase.ts
```

This plan leverages Quipubase's real-time capabilities, schema validation, and file storage while building a modern WordPress alternative with Vue 3.