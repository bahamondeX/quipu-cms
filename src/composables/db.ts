// src/composables/useQuipubase.ts
import { Quipubase } from 'quipubase';
import { ZodTypeAny } from 'zod';
import type { BaseModel } from '~/models';
import type { JsonSchema7Type } from 'zod-to-json-schema';

export function useQuipubase<T extends BaseModel<ZodTypeAny>[]>() {
	type StatefullRegistry<T> = {
		items:T[]
		jsonSchema:JsonSchema7Type
		collectionId:string
	}

	const q = new Quipubase()
	const registry = ref<StatefullRegistry<T>[]>([])
	const createCollection = async(schema:JsonSchema7Type)=>{
		const collection = await q.collections.create({json_schema:schema})
		const collectionId = collection.id
		registry.value.push({items:[],jsonSchema:schema,collectionId})
		for await (const item of q.objects.sub({collection_id:collectionId})){
			registry.value.find((r)=>r.collectionId==collectionId)?.items.push(
	}
	
}

}