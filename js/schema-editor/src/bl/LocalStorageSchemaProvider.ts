import { SchemaRoot } from 'fusefx-modeldescription'
import { ISchemaProvider } from './ISchemaProvider'
import { SchemaInfo } from './SchemaInfo'

export class LocalStorageSchemaProvider implements ISchemaProvider {
  getSchemaNames(): Promise<SchemaInfo[]> {
    const schemasJson: string | null = localStorage.getItem('schema_lib')
    if (!schemasJson) {
      return new Promise<SchemaInfo[]>((res) => {
        return res([])
      })
    }
    const schemas: { [schemaName: string]: SchemaRoot } = JSON.parse(schemasJson)
    return new Promise<SchemaInfo[]>((res) => {
      return res(
        Object.keys(schemas).map((sn) => {
          return { name: sn }
        }),
      )
    })
  }

  loadSchema(schemaName: string): SchemaRoot {
    // return new SchemaRoot()
    const schemasJson: string | null = localStorage.getItem('schema_lib')
    if (!schemasJson) return new SchemaRoot()

    const schemas: { [schemaName: string]: SchemaRoot } = JSON.parse(schemasJson)
    const schema: SchemaRoot = schemas[schemaName]
    return schemaName in schemas ? schemas[schemaName] : new SchemaRoot()
  }

  saveSchema(schemaName: string, schema: SchemaRoot): Promise<void> {
    const schemasJson: string | null = localStorage.getItem('schema_lib')
    const schemas: { [schemaName: string]: SchemaRoot } = schemasJson ? JSON.parse(schemasJson) : {}
    schemas[schemaName] = schema
    localStorage.setItem('schema_lib', JSON.stringify(schemas))
    return new Promise<void>((res) => res())
  }

  deleteSchema(schemaName: string): void {
    throw new Error('Method not implemented.')
  }

  updateName(oldName: string, newName: string): void {
    const schemasJson: string | null = localStorage.getItem('schema_lib')
    const schemas: { [schemaName: string]: SchemaRoot } = schemasJson ? JSON.parse(schemasJson) : {}
    if (!(oldName in schemas)) return
    const s: SchemaRoot = { ...schemas[oldName] }
    delete schemas[oldName]
    schemas[newName] = s
    localStorage.setItem('schema_lib', JSON.stringify(schemas))
  }
}
