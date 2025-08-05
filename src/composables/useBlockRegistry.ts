import type { BlockDefinition } from '~/types/blocks'
import type { Block } from '~/types/blocks'

const blocks = new Map<string, BlockDefinition>()
const categories = reactive({
	layout: { title: 'Layout', icon: 'layout' },
	content: { title: 'Content', icon: 'type' },
	media: { title: 'Media', icon: 'image' },
	widgets: { title: 'Widgets', icon: 'grid' },
	advanced: { title: 'Advanced', icon: 'settings' }
})

export const useBlockRegistry = () => {
	const registerBlock = (definition: BlockDefinition) => {
		blocks.set(definition.name, definition)
	}

	const getBlock = (name: string): BlockDefinition | undefined => {
		return blocks.get(name)
	}

	const getAllBlocks = (): BlockDefinition[] => {
		return Array.from(blocks.values())
	}

	const getBlocksByCategory = (category: string): BlockDefinition[] => {
		return Array.from(blocks.values()).filter(block => block.category === category)
	}

	const searchBlocks = (query: string): BlockDefinition[] => {
		const lowerQuery = query.toLowerCase()
		return Array.from(blocks.values()).filter(block =>
			block.title.toLowerCase().includes(lowerQuery) ||
			block.description.toLowerCase().includes(lowerQuery) ||
			block.keywords.some(keyword => keyword.toLowerCase().includes(lowerQuery))
		)
	}

	const createBlock = (name: string, attributes: Record<string, any> = {}): Block => {
		const definition = getBlock(name)
		if (!definition) {
			throw new Error(`Block "${name}" not found`)
		}

		const mergedAttributes = { ...definition.attributes }
		Object.keys(definition.attributes).forEach(key => {
			const attr = definition.attributes[key]
			if (attr.default !== undefined) {
				mergedAttributes[key] = attr.default
			}
		})

		return {
			id: crypto.randomUUID(),
			type: name,
			content: { ...mergedAttributes, ...attributes },
			settings: {},
			children: []
		}
	}

	return {
		blocks,
		categories,
		registerBlock,
		getBlock,
		getAllBlocks,
		getBlocksByCategory,
		searchBlocks,
		createBlock
	}
}
