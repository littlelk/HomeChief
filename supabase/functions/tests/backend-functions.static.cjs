const assert = require('assert')
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')

function read(relativePath) {
  const file = path.join(root, relativePath)
  assert.ok(fs.existsSync(file), `missing ${relativePath}`)
  return fs.readFileSync(file, 'utf8')
}

const sharedSession = read('_shared/session.ts')
assert.ok(sharedSession.includes('export function readBearerToken'))
assert.ok(sharedSession.includes('export async function sha256Hex'))

const wechatLogin = read('wechat-login/index.ts')
assert.ok(wechatLogin.includes('export async function parseWechatLoginRequest'))
assert.ok(wechatLogin.includes('export async function handler'))
assert.ok(wechatLogin.includes('missing_code'))

const cosUploadToken = read('cos-upload-token/index.ts')
assert.ok(cosUploadToken.includes('export async function parseCosUploadRequest'))
assert.ok(cosUploadToken.includes('export async function handler'))
assert.ok(cosUploadToken.includes('missing_family_id'))
assert.ok(cosUploadToken.includes('invalid_mime_type'))

const familyOnboarding = read('family-onboarding/index.ts')
assert.ok(familyOnboarding.includes('export async function parseFamilyOnboardingRequest'))
assert.ok(familyOnboarding.includes('export async function performFamilyOnboarding'))
assert.ok(familyOnboarding.includes('missing_token'))
assert.ok(familyOnboarding.includes('invalid_session'))
assert.ok(familyOnboarding.includes('join_family'))
assert.ok(familyOnboarding.includes('update_family_name'))
assert.ok(familyOnboarding.includes('update_profile'))

for (const file of [
  'media-assets-create/index.ts',
  'deno.json',
  'tests/wechat-login.test.ts',
  'tests/cos-upload-token.test.ts',
  'tests/family-onboarding.test.ts',
]) {
  read(file)
}

console.log('homechief backend function static tests passed')
