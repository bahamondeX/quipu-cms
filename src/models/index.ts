// models/index.ts
import { z } from 'zod'
import { BaseModel } from 'quipubase'
import { quipu } from '~/plugins/quipubase'

// Set the Quipubase instance for all models
BaseModel.q = quipu

// Block schema for page builder content - fixed recursive definition
const BaseBlockSchema = z.object({
	id: z.string(),
	type: z.string(),
	content: z.record(z.string(), z.any()),
	settings: z.record(z.string(), z.any()).default({})
})

export const BlockSchema = BaseBlockSchema.extend({
	children: z.lazy(() => z.array(BaseBlockSchema)).optional()
})

export type Block = z.infer<typeof BlockSchema>

// Post Model
export class Post extends BaseModel<typeof Post.schema> {
	static schema = z.object({
		id: z.string().uuid(),
		title: z.string().min(1, 'Title is required'),
		slug: z.string().min(1, 'Slug is required'),
		content: z.array(BlockSchema).default([]),
		excerpt: z.string().optional(),
		status: z.enum(['draft', 'published', 'private', 'trash']).default('draft'),
		author_id: z.string(),
		featured_image: z.string().url().optional(),
		categories: z.array(z.string()).default([]),
		tags: z.array(z.string()).default([]),
		meta: z.record(z.string(), z.any()).default({}),
		seo: z.object({
			title: z.string().optional(),
			description: z.string().optional(),
			keywords: z.array(z.string()).default([])
		}).default({}),
		published_at: z.string().datetime().optional(),
		created_at: z.string().datetime().default(() => new Date().toISOString()),
		updated_at: z.string().datetime().default(() => new Date().toISOString())
	})

	get author() {
		return this._data.author_id
	}

	static async getPublished() {
		return await this.query({ status: 'published' })
	}

	static async getBySlug(slug: string) {
		const results = await this.query({ slug })
		return results[0] || null
	}

	async publish() {
		this._data.status = 'published'
		this._data.published_at = new Date().toISOString()
		this._data.updated_at = new Date().toISOString()
		return await this.upsert()
	}
}

// Page Model
export class Page extends BaseModel<typeof Page.schema> {
	static schema = z.object({
		id: z.string().uuid(),
		title: z.string().min(1, 'Title is required'),
		slug: z.string().min(1, 'Slug is required'),
		content: z.array(BlockSchema).default([]),
		status: z.enum(['draft', 'published', 'private', 'trash']).default('draft'),
		template: z.string().default('default'),
		parent_id: z.string().optional(),
		menu_order: z.number().default(0),
		featured_image: z.string().url().optional(),
		author_id: z.string(),
		meta: z.record(z.string(), z.any()).default({}),
		seo: z.object({
			title: z.string().optional(),
			description: z.string().optional(),
			keywords: z.array(z.string()).default([])
		}).default({}),
		created_at: z.string().datetime().default(() => new Date().toISOString()),
		updated_at: z.string().datetime().default(() => new Date().toISOString())
	})

	get author() {
		return this._data.author_id
	}

	static async getBySlug(slug: string) {
		const results = await this.query({ slug })
		return results[0] || null
	}

	static async getHierarchy() {
		const pages = await this.query({ status: 'published' })
		return this.buildHierarchy(pages)
	}

	private static buildHierarchy(pages: any[], parentId?: string): any[] {
		return pages
			.filter(page => page.parent_id === parentId)
			.sort((a, b) => a.menu_order - b.menu_order)
			.map(page => ({
				...page,
				children: this.buildHierarchy(pages, page.id)
			}))
	}
}

// User Model
export class User extends BaseModel<typeof User.schema> {
	static schema = z.object({
		id: z.string().uuid(),
		username: z.string().min(3, 'Username must be at least 3 characters'),
		email: z.string().email('Invalid email format'),
		password_hash: z.string(),
		role: z.enum(['admin', 'editor', 'author', 'contributor', 'subscriber']).default('subscriber'),
		display_name: z.string().min(1, 'Display name is required'),
		first_name: z.string().optional(),
		last_name: z.string().optional(),
		avatar: z.string().url().optional(),
		bio: z.string().optional(),
		website: z.string().url().optional(),
		social: z.object({
			twitter: z.string().optional(),
			facebook: z.string().optional(),
			linkedin: z.string().optional(),
			instagram: z.string().optional()
		}).default({}),
		preferences: z.record(z.string(), z.any()).default({}),
		last_login: z.string().datetime().optional(),
		created_at: z.string().datetime().default(() => new Date().toISOString()),
		updated_at: z.string().datetime().default(() => new Date().toISOString())
	})

	static async getByEmail(email: string) {
		const results = await this.query({ email })
		return results[0] || null
	}

	static async getByUsername(username: string) {
		const results = await this.query({ username })
		return results[0] || null
	}

	canEdit(content: Post | Page) {
		const role = this._data.role
		if (role === 'admin' || role === 'editor') return true
		if ((role === 'author' || role === 'contributor') && content.author === this._data.id)
		return false
	}
}

// Media Model
export class Media extends BaseModel<typeof Media.schema> {
	static schema = z.object({
		id: z.string().uuid(),
		filename: z.string().min(1, 'Filename is required'),
		original_filename: z.string().min(1, 'Original filename is required'),
		path: z.string().min(1, 'Path is required'),
		url: z.string().url('Invalid URL format'),
		alt_text: z.string().optional(),
		caption: z.string().optional(),
		description: z.string().optional(),
		mime_type: z.string().min(1, 'MIME type is required'),
		size: z.number().positive('Size must be positive'),
		width: z.number().positive().optional(),
		height: z.number().positive().optional(),
		uploaded_by: z.string(),
		folder: z.string().default('uploads'),
		meta: z.record(z.string(), z.any()).default({}),
		created_at: z.string().datetime().default(() => new Date().toISOString())
	})

	static async getByMimeType(type: string) {
		return await this.query({ mime_type: type })
	}

	static async getImages() {
		const media = await this.query({})
		return media.filter(m => m.mime_type.startsWith('image/'))
	}

	static async getVideos() {
		const media = await this.query({})
		return media.filter(m => m.mime_type.startsWith('video/'))
	}

	isImage(): boolean {
		return this._data.mime_type.startsWith('image/')
	}

	isVideo(): boolean {
		return this._data.mime_type.startsWith('video/')
	}

	getDisplaySize(): string {
		const bytes = this._data.size
		const sizes = ['B', 'KB', 'MB', 'GB']
		if (bytes === 0) return '0 B'
		const i = Math.floor(Math.log(bytes) / Math.log(1024))
		return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
	}
}

// Category Model
export class Category extends BaseModel<typeof Category.schema> {
	static schema = z.object({
		id: z.string().uuid(),
		name: z.string().min(1, 'Name is required'),
		slug: z.string().min(1, 'Slug is required'),
		description: z.string().optional(),
		parent_id: z.string().optional(),
		count: z.number().default(0),
		created_at: z.string().datetime().default(() => new Date().toISOString())
	})

	static async getHierarchy() {
		const categories = await this.query({})
		return this.buildHierarchy(categories)
	}

	private static buildHierarchy(categories: any[], parentId?: string): any[] {
		return categories
			.filter(cat => cat.parent_id === parentId)
			.map(cat => ({
				...cat,
				children: this.buildHierarchy(categories, cat.id)
			}))
	}
}

// Site Settings Model
export class SiteSettings extends BaseModel<typeof SiteSettings.schema> {
	static schema = z.object({
		id: z.string().uuid(),
		site_title: z.string().default('My Site'),
		site_description: z.string().default('Just another site'),
		site_url: z.string().url().optional(),
		admin_email: z.string().email(),
		date_format: z.string().default('Y-m-d'),
		time_format: z.string().default('H:i'),
		timezone: z.string().default('UTC'),
		language: z.string().default('en_US'),
		theme: z.string().default('default'),
		posts_per_page: z.number().positive().default(10),
		comments_enabled: z.boolean().default(true),
		registration_enabled: z.boolean().default(false),
		default_role: z.enum(['admin', 'editor', 'author', 'contributor', 'subscriber']).default('subscriber'),
		maintenance_mode: z.boolean().default(false),
		seo: z.object({
			meta_description: z.string().optional(),
			meta_keywords: z.array(z.string()).default([]),
			og_image: z.string().url().optional()
		}).default({}),
		social: z.object({
			facebook: z.string().url().optional(),
			twitter: z.string().url().optional(),
			instagram: z.string().url().optional(),
			linkedin: z.string().url().optional()
		}).default({}),
		analytics: z.object({
			google_analytics: z.string().optional(),
			google_tag_manager: z.string().optional()
		}).default({}),
		updated_at: z.string().datetime().default(() => new Date().toISOString())
	})

	static async get() {
		return await this.query({})
	}
}

export type PostType = z.infer<typeof Post.schema>
export type PageType = z.infer<typeof Page.schema>
export type UserType = z.infer<typeof User.schema>
export type MediaType = z.infer<typeof Media.schema>
export type CategoryType = z.infer<typeof Category.schema>
export type SiteSettingsType = z.infer<typeof SiteSettings.schema>