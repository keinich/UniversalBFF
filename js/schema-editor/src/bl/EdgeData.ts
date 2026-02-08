import { RelationSchema } from 'fusefx-modeldescription'

export interface EdgeData {
  id: string
  nodeStartId: number
  nodeEndId: number
  inputFieldName: string
  outputFieldName: string
  relation: RelationSchema
  previousStartPosition: { x: number; y: number }
  currentStartPosition: { x: number; y: number }
  previousEndPosition: { x: number; y: number }
  currentEndPosition: { x: number; y: number }
}
