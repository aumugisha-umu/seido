/**
 * Generates a human-readable Markdown discovery tree from discovery-tree.json
 *
 * Usage: npx tsx scripts/generate-discovery-tree.ts
 * Output: docs/qa/discovery-tree.md
 */

import fs from 'fs'
import path from 'path'

const TREE_PATH = path.join(process.cwd(), 'docs/qa/discovery-tree.json')
const OUTPUT_PATH = path.join(process.cwd(), 'docs/qa/discovery-tree.md')

interface TreeNode {
  id: string
  path: string
  label: string
  mode: 'discovery' | 'creation' | 'destruction'
  checks: string[]
  children: string[]
  lastTested: string | null
  status: 'untested' | 'pass' | 'fail' | 'skip' | 'discovered'
  testData?: Record<string, string>
}

interface CrossRolePhase {
  phase: number
  label: string
  role: string
  actions: string[]
}

interface CrossRoleScenario {
  id: string
  label: string
  phases: CrossRolePhase[]
}

interface RoleTree {
  entry: string
  nodes: TreeNode[]
}

interface CrossRoleTree {
  entry: string
  description: string
  scenarios: CrossRoleScenario[]
}

interface DiscoveryTree {
  version: string
  lastUpdated: string
  roles: {
    gestionnaire: RoleTree
    locataire: RoleTree
    prestataire: RoleTree
    'cross-role': CrossRoleTree
  }
}

const MODE_ICONS: Record<string, string> = {
  discovery: '(discovery)',
  creation: '(creation)',
  destruction: '(destruction)',
}

const STATUS_ICONS: Record<string, string> = {
  untested: '[ ]',
  pass: '[x]',
  fail: '[!]',
  skip: '[-]',
  discovered: '[?]',
}

function buildNodeMap(nodes: TreeNode[]): Map<string, TreeNode> {
  const map = new Map<string, TreeNode>()
  for (const node of nodes) {
    map.set(node.id, node)
  }
  return map
}

function renderNode(node: TreeNode, nodeMap: Map<string, TreeNode>, indent: number): string {
  const prefix = '  '.repeat(indent)
  const connector = indent === 0 ? '' : '- '
  const status = STATUS_ICONS[node.status] || '[ ]'
  const mode = MODE_ICONS[node.mode] || ''
  const tested = node.lastTested ? ` (last: ${node.lastTested.split('T')[0]})` : ''

  let line = `${prefix}${connector}${status} **${node.label}** ${mode} \`${node.path}\`${tested}\n`

  for (const childId of node.children) {
    const child = nodeMap.get(childId)
    if (child) {
      line += renderNode(child, nodeMap, indent + 1)
    } else {
      line += `${prefix}  - [ ] _(missing node: ${childId})_\n`
    }
  }

  return line
}

function renderRole(roleName: string, role: RoleTree, emoji: string): string {
  const nodeMap = buildNodeMap(role.nodes)
  const rootNodes = role.nodes.filter(
    (n) => !role.nodes.some((other) => other.children.includes(n.id))
  )

  let md = `## ${emoji} ${roleName.charAt(0).toUpperCase() + roleName.slice(1)}\n\n`
  md += `Entry: \`${role.entry}\`\n\n`

  for (const node of rootNodes) {
    md += renderNode(node, nodeMap, 0)
  }

  return md + '\n'
}

function renderCrossRole(crossRole: CrossRoleTree): string {
  let md = `## Cross-Role Scenarios\n\n`
  md += `${crossRole.description}\n\n`

  for (const scenario of crossRole.scenarios) {
    md += `### ${scenario.label}\n\n`
    for (const phase of scenario.phases) {
      md += `**Phase ${phase.phase}: ${phase.label}** (${phase.role})\n`
      for (const action of phase.actions) {
        md += `- ${action}\n`
      }
      md += '\n'
    }
  }

  return md
}

function main() {
  const raw = fs.readFileSync(TREE_PATH, 'utf-8')
  const tree: DiscoveryTree = JSON.parse(raw)

  const totalNodes =
    tree.roles.gestionnaire.nodes.length +
    tree.roles.locataire.nodes.length +
    tree.roles.prestataire.nodes.length

  const passedNodes = [
    ...tree.roles.gestionnaire.nodes,
    ...tree.roles.locataire.nodes,
    ...tree.roles.prestataire.nodes,
  ].filter((n) => n.status === 'pass').length

  const failedNodes = [
    ...tree.roles.gestionnaire.nodes,
    ...tree.roles.locataire.nodes,
    ...tree.roles.prestataire.nodes,
  ].filter((n) => n.status === 'fail').length

  let md = `# SEIDO Discovery Tree\n\n`
  md += `> Auto-generated from \`docs/qa/discovery-tree.json\` — do not edit manually.\n\n`
  md += `**Version:** ${tree.version} | **Last Updated:** ${tree.lastUpdated}\n\n`
  md += `**Coverage:** ${passedNodes}/${totalNodes} passed | ${failedNodes} failed | ${totalNodes - passedNodes - failedNodes} untested\n\n`
  md += `---\n\n`

  md += renderRole('gestionnaire', tree.roles.gestionnaire, 'Gestionnaire')
  md += renderRole('locataire', tree.roles.locataire, 'Locataire')
  md += renderRole('prestataire', tree.roles.prestataire, 'Prestataire')
  md += renderCrossRole(tree.roles['cross-role'])

  fs.writeFileSync(OUTPUT_PATH, md)
  console.log(`Discovery tree generated: ${OUTPUT_PATH}`)
  console.log(`Total nodes: ${totalNodes} | Passed: ${passedNodes} | Failed: ${failedNodes}`)
}

main()
