import Ajv from 'ajv';
import { type $Compiler, wrapCompilerAsTypeGuard } from 'json-schema-to-ts';

const AJV = new Ajv();
const $compile: $Compiler = (schema) => AJV.compile(schema);
export const compileSchema = wrapCompilerAsTypeGuard($compile);
