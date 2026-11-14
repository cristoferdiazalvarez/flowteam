import FlowTeam from '@/components/flowteam';
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <FlowTeam inviteToken={token} />;
}
