import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '..', '.env') })

import { websiteFinder } from '../lib/services/website-finder'
import { socialMediaFinder } from '../lib/services/social-media-finder'
import { cnpjFinder } from '../lib/services/cnpj-finder'

async function main() {
  console.log('Testing Discovery Services...\n')

  // Test 1: Website Finder
  console.log('1. Testing Website Finder for PagBank...')
  const websiteResult = await websiteFinder.findWebsite('PagBank')
  console.log('   Website:', websiteResult.url)
  console.log('   Source:', websiteResult.source)
  console.log('   Confidence:', websiteResult.confidence)

  if (!websiteResult.url) {
    console.log('Website not found, stopping tests')
    return
  }

  // Test 2: CNPJ Finder
  console.log('\n2. Testing CNPJ Finder for PagBank...')
  const cnpj = await cnpjFinder.findCNPJByName('PagBank', websiteResult.url)
  console.log('   CNPJ:', cnpj || 'Not found')

  // Test 3: Social Media Finder
  console.log('\n3. Testing Social Media Finder for PagBank...')
  const social = await socialMediaFinder.findSocialMedia('PagBank', websiteResult.url)
  console.log('   LinkedIn:', social.linkedin || 'Not found')
  console.log('   Instagram:', social.instagram || 'Not found')
  console.log('   Twitter:', social.twitter || 'Not found')
  console.log('   Source:', social.source)

  console.log('\nAll tests completed!')
}

main().catch(console.error)
