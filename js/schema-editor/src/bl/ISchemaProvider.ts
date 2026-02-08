import { SchemaRoot } from 'fusefx-modeldescription'
import { SchemaInfo } from './SchemaInfo'

export interface ISchemaProvider {
  getSchemaNames(): Promise<SchemaInfo[]>
  loadSchema(schemaName: string): SchemaRoot
  saveSchema(schemaName: string, schema: SchemaRoot): Promise<void>
  deleteSchema(schemaName: string): void
  updateName(oldName: string, newName: string): void
}
