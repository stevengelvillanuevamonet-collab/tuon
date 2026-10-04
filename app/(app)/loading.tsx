import { Loader } from "@/components/brand/loader";

// Shown while any page inside the app (dashboard or a room) is loading.
export default function Loading() {
  return <Loader fill label="Loading your rooms" />;
}
