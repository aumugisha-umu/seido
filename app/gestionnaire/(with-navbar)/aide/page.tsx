import { getServerAuthContext } from "@/lib/server-context"
import { AidePageClient } from "./aide-client"

export default async function AidePage() {
  await getServerAuthContext('gestionnaire')

  return <AidePageClient />
}
