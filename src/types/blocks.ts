// types/blocks.ts
import type { Component } from 'vue'

export interface BlockAttribute {
	type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'image' | 'color' | 'select'
	label: string
	default?: any
	options?: Array<{ label: string; value: any }>
	placeholder?: string
	description?: string
	required?: boolean
}

export interface BlockDefinition {
	name: string
	title: string
	description: string
	icon: string
	category: 'layout' | 'content' | 'media' | 'widgets' | 'advanced'
	keywords: string[]
	attributes: Record<string, BlockAttribute>
	supports: {
		anchor?: boolean
		customClassName?: boolean
		align?: boolean | string[]
		spacing?: boolean
	}
	render: Component
	edit: Component
	save?: Component
}

// Use the same Block interface as the models
export interface Block {
	id: string
	type: string // Changed from 'name' to 'type' to match BlockSchema
	content: Record<string, any> // Changed from 'attributes' to 'content'
	settings: Record<string, any> // Added settings
	children?: Block[] // Changed from 'innerBlocks' to 'children'
	anchor?: string
	className?: string
	align?: string
}

export interface BlockContext {
	isSelected: boolean
	isEditing: boolean
	clientId: string
	setContent: (content: Record<string, any>) => void // Changed from setAttributes
	setSettings: (settings: Record<string, any>) => void // Added setSettings
	insertBlock: (block: Block, index?: number) => void
	removeBlock: (clientId: string) => void
	selectBlock: (clientId: string) => void
}

export const blockContext = (state: any) => (blockId: string): BlockContext => ({
	isSelected: state.selectedBlockId === blockId,
	isEditing: state.isEditing,
	clientId: blockId,
	setContent: (content: Record<string, any>) => {
		state.updateBlockContent(blockId, content)
	},
	setSettings: (settings: Record<string, any>) => {
		state.updateBlockSettings(blockId, settings)
	},
	insertBlock: (block: Block, index?: number) => {
		state.insertBlock(block, index)
	},
	removeBlock: (clientId: string) => {
		state.removeBlock(clientId)
	},
	selectBlock: (clientId: string) => {
		state.selectedBlockId = clientId
	}
})