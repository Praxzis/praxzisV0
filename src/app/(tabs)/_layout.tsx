import { Tabs } from 'expo-router/js-tabs';

import { PaperTabBar, useNotebook } from '@/notebook';

export default function TabsLayout() {
  const { m } = useNotebook();
  return (
    <Tabs
      tabBar={(props) => <PaperTabBar {...props} />}
      screenOptions={{ headerShown: false, animation: 'none', freezeOnBlur: true, lazy: false, sceneStyle: { backgroundColor: m.desk } }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
      <Tabs.Screen name="library" options={{ title: 'Library' }} />
      <Tabs.Screen name="mind" options={{ title: 'My Mind' }} />
      <Tabs.Screen name="council" options={{ title: 'Council' }} />
      <Tabs.Screen name="ideas" options={{ title: 'Ideas' }} />
    </Tabs>
  );
}
