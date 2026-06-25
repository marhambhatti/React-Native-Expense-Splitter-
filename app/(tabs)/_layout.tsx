import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ComponentProps } from 'react';
import { useTheme } from '../../context/ThemeContext';

type TabIconProps = {
  icon: ComponentProps<typeof Ionicons>['name'];
  label: string;
  focused: boolean;
};

function TabIcon({ icon, label, focused }: TabIconProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.tabItem}>
      <View
        style={[
          styles.iconWrapper,
          focused && { backgroundColor: theme.primaryLight },
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={focused ? theme.primary : theme.grayLight}
        />
      </View>
      <Text
        style={[
          styles.label,
          { color: focused ? theme.primary : theme.grayLight },
          focused && styles.labelActive,
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.8}
      >
        {label}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  const { theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: theme.tabBar,
            borderTopColor: theme.tabBarBorder,
          },
        ],
        tabBarIconStyle: {
          width: '100%',
          justifyContent: 'center',
          alignItems: 'center',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={focused ? 'home' : 'home-outline'} label="Home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon={focused ? 'people' : 'people-outline'} label="Groups" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="add-expense"
        options={{
          tabBarIcon: () => (
            <View style={[styles.addButton, { backgroundColor: theme.primary }]}>
              <Ionicons name="add" size={30} color="#FFFFFF" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon={focused ? 'notifications' : 'notifications-outline'}
              label="Activity"
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              icon={focused ? 'person' : 'person-outline'}
              label="Profile"
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 85 : 70,
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    flexDirection: 'row',
  },
  tabItem: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  iconWrapper: {
    width: 40,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  labelActive: {
    fontWeight: '700',
  },
  addButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Platform.OS === 'ios' ? 10 : 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
});