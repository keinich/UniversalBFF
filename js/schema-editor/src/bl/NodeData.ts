import { EntitySchema } from 'fusefx-modeldescription'

export interface NodeData {
  id: number
  numInputs: number
  numOutputs: number
  previousPosition: { x: number; y: number }
  currentPosition: { x: number; y: number }
  inputEdgeIds: string[]
  outputEdgeIds: string[]
  entitySchema: EntitySchema
  color?: string
}
