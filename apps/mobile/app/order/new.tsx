import { Redirect, useLocalSearchParams } from 'expo-router';

export default function OrderNewRedirect() {
  const params = useLocalSearchParams<Record<string, string | string[] | undefined>>();
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') {
      query.set(key, value);
    }
  }

  const suffix = query.toString();
  return <Redirect href={suffix ? `/(tabs)/order/new?${suffix}` : '/(tabs)/order/new'} />;
}
