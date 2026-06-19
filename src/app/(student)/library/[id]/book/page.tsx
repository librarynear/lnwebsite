import { redirect } from "next/navigation";

export default async function BookingCheckoutPage(props: any) {
  const params = await props.params;
  const id = params?.id;
  
  if (id) {
    redirect(`/library/${id}?embed=true#booking-widget`);
  }
  
  return null;
}
