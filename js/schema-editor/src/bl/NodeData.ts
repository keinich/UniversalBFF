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
  /**
   * Number of inherited fields currently displayed on this node.
   * Used by EditorEdge2 to correctly compute field handle positions
   * when inheritance rows are shown above own fields.
   */
  inheritedFieldCount?: number
}
