# project-to-openapi

Tools for writing living openapi standards into your project files.

## Usage

Install from NPM and require. Can be used in build tools like Gulp to create tasks to build and view the OpenAPI definition for the project.

### Swagger JSDoc comments

The build process uses `swagger-jsdoc` to find and consume properly formatted `@swagger` JSDoc tags in files passed using glob option `apis`. Such tags must be properly formatted YAML starting at the path property.

```js
/**
 * @swagger
 * /send:
 *   post:
 *     summary: Sends a document.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SendRequest'
 *     responses:
 *       '200':
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SendResponse'
 */
function example () {}
```

### TypeScript Files

Definitions from TypeScript may also be passed, and will be consumed using `ts-json-schema-generator`. One or more globs may be passed to `typeScript` configuration option, representing TypeScript entry points. If this is a TypeScript project, it only really makes sense to pass the main entry point. However, this supports passing multiple TypeScript entry points, so if more than one project's interfaces are needed, or there is a collection of independent TypeScript definitions, this may be done.

Since this is using `ts-json-schema-generator`, TSDoc and JSDoc tags will be honored that can be mapped to the OpenAPI spec. Anything that library supports will end up in the generated schema.

```ts
export interface MyExample {
  /**
   * @pattern ^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$
   */
  example: string
}
```

### JSON Schemas

Using glob configuration `jsonSchema`, one or more JSON schema files can be consumed. Each one will be parsed and have incompatible features removed before exporting to a YAML format that can be merged into the component schemas of the resulting OpenAPI definition. This uses a best effort process, so don't expect a complete one-to-one transfer to OpenAPI of draft 6 or draft 7 JSON schema since only a subset is supported in the official spec.

This allows writing modern JSON schema which can be used internally and distributed separately for validating data, but that can still be easily represented in the OpenAPI definition.

The following JSON schema features WILL be removed for OpenAPI compatibility:
- $schema
- additionalItems
- const
- contains
- dependencies
- id
- $id
- patternProperties
- propertyNames
- if
- then
- else

Instances of `type` that are an array of types will be converted into a `oneOf` array of multiple valid types.

## Configuration

Options can be provided at run-time, or they will be picked up from `.pj2openapirc.json` the current working directory.

Options for all exported methods use the following interface:
```ts
interface ProjectToOpenApiConfig {
  /** An array of globs for picking which files contain API information. */
  apis?: string[]
  /** An array of globs for passing json schemas as component schemas.
   * If a title property has been provided in the root of a json schema,
   * that title will be used to name the component schema.
   */
  jsonSchema?: string | string[]
  /** An array of globs for passing typescript files as component schemas.
   * TSDoc and JSDoc tags will be honored if they can be mapped to OAS schema tags.
   */
  typeScript?: string | string[]
  /** Defaults to `swagger.definiton.js` in the current directory. */
  swaggerDefinition?: any
  /** Defaults to built-in compiler options or tsconfig.json in the current directory. */
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
```