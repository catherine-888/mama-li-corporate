import { fetchTimeslots, fetchLocations } from '@/lib/content';
import ConfirmationClient from './confirmation-client';

export default async function ConfirmationPage() {
  const [timeslots, locations] = await Promise.all([fetchTimeslots(), fetchLocations()]);
  return <ConfirmationClient timeslots={timeslots} locations={locations} />;
}
