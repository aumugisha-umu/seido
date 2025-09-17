import ProfilePage from "@/components/profile-page"

export default function AdminProfilePage() {
  return (
    <ProfilePage 
      role="admin" 
      dashboardPath="/admin/dashboard" 
    />
  )
}