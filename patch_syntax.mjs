import { readFileSync, writeFileSync } from 'fs';

const filePath = 'e:\\UnityBU\\unity-v2\\src\\lib\\awsDynamo.js';
let content = readFileSync(filePath, 'utf8');

// The mangled block we're targeting:
// /**
//  * ADMIN: Gets all registered Tenants
// 
// /**
// * ADMIN: Update a user's RBAC string

const mangledStart = `/**
 * ADMIN: Gets all registered Tenants

/**
 * ADMIN: Update a user's RBAC string
 */`;

const cleanedStart = `/**
 * ADMIN: Update a user's RBAC string
 */`;

content = content.replace(mangledStart, cleanedStart);

const mangledEnd = `}

 */
export async function getAllTenants() {`;

const cleanedEnd = `}

/**
 * ADMIN: Gets all registered Tenants
 */
export async function getAllTenants() {`;

content = content.replace(mangledEnd, cleanedEnd);

writeFileSync(filePath, content, 'utf8');
console.log('Fixed awsDynamo.js JSdoc syntax error');
