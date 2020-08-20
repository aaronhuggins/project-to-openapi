declare module 'project-to-openapi' {
  interface ProjectToOpenApiConfig {
    swaggerDefinition?: any
    apis?: string[]
    jsonSchema?: string | string[]
    typeScript?: string | string[]
    tsconfig?: string
    /** @default true */
    skipTypeCheck?: boolean
    /** @default '*' */
    types?: string | string[]
    /** @default [] */
    expandTypes?: string[]
    /** @default [] */
    removeProps?: string[]
    /** @default true */
    detectGraphQL?: boolean
    /** @default ['Maybe', 'Scalar'] */
    graphQLExpandedTypes?: string[]
    /** @default false */
    toYAML?: boolean
    /** @default 'openapi.yaml' */
    filename?: string
    /** @default 9000 */
    port?: number
  }

  async function jsonSchemaToOpenApi(options: ProjectToOpenApiConfig): Promise<void>
  async function typeScriptToOpenApi(options: ProjectToOpenApiConfig): Promise<void>
  async function projectToOpenApi(options?: ProjectToOpenApiConfig): Promise<void>
  async function viewOpenApi(options?: ProjectToOpenApiConfig, build: boolean = false): Promise<void>

  export = {
    jsonSchemaToOpenApi,
    typeScriptToOpenApi,
    projectToOpenApi,
    viewOpenApi
  }
}
