import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { generateConfigYaml } from './configYaml'
import { generateRgFeatureFlags } from './rgFeatureFlags'

export async function generateAndDownloadZip(
  selections: Record<string, string | boolean | number>,
  companyName: string,
) {
  const zip = new JSZip()

  const configYaml = generateConfigYaml(selections, companyName)
  zip.file('config.yaml', configYaml)

  const rgFlags = generateRgFeatureFlags(selections)
  zip.file('rg-feature-flags.yaml', rgFlags)

  const zipBlob = await zip.generateAsync({ type: 'blob' })
  const safeName = companyName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase() || 'openedx-mobile'
  const date = new Date().toISOString().slice(0, 10)
  saveAs(zipBlob, `${safeName}-mobile-config-${date}.zip`)
}

export function downloadYamlFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/yaml;charset=utf-8' })
  saveAs(blob, filename)
}
