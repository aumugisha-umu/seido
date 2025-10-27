import sharp from 'sharp'
import { promises as fs } from 'fs'
import path from 'path'

const INPUT_IMAGE = path.join(process.cwd(), 'public', 'icons', 'icon-192x192 white bg.jpg')
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'icons')

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512]

async function generateIcons() {
  console.log('🎨 Generating PWA icons...\n')

  try {
    // Vérifier que l'image source existe
    await fs.access(INPUT_IMAGE)
    console.log('✅ Source image found:', INPUT_IMAGE)

    // Créer le dossier de sortie s'il n'existe pas
    try {
      await fs.access(OUTPUT_DIR)
      console.log('✅ Output directory exists:', OUTPUT_DIR, '\n')
    } catch {
      await fs.mkdir(OUTPUT_DIR, { recursive: true })
      console.log('✅ Output directory created:', OUTPUT_DIR, '\n')
    }

    // Générer chaque taille
    for (const size of ICON_SIZES) {
      const outputPath = path.join(OUTPUT_DIR, `icon-${size}x${size}.png`)

      await sharp(INPUT_IMAGE)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toFile(outputPath)

      console.log(`✅ Generated ${size}x${size}`)
    }

    console.log('\n🎉 All PWA icons generated successfully!')
    console.log(`📁 Icons location: ${OUTPUT_DIR}`)

  } catch (error) {
    console.error('❌ Error generating icons:', error)
    process.exit(1)
  }
}

generateIcons()
