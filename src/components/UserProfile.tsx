import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useAuth } from '@/utils';
import { Garage61User } from '@/types';

const UserProfile: React.FC = () => {
  const { user, isLoading, error, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading user data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <Text style={styles.errorSubtext}>
          Please check your API token and network connection.
        </Text>
      </View>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Not authenticated</Text>
        <Text style={styles.errorSubtext}>
          Please check your GARAGE61_API_TOKEN in .env.local
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Garage 61 User Profile</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Basic Information</Text>
        <InfoRow label="Name" value={`${user.firstName} ${user.lastName}`} />
        <InfoRow label="Nickname" value={user.nickName} />
        <InfoRow label="User ID" value={user.id} />
        <InfoRow label="Slug" value={user.slug} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Subscription</Text>
        <InfoRow label="Plan" value={user.subscriptionPlan} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>API Permissions</Text>
        <View style={styles.permissionsContainer}>
          {user.apiPermissions.map((permission, index) => (
            <Text key={index} style={styles.permission}>
              {permission}
            </Text>
          ))}
        </View>
      </View>

      {user.teams && user.teams.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Teams ({user.teams.length})</Text>
          {user.teams.map((team, index) => (
            <View key={index} style={styles.teamItem}>
              <Text style={styles.teamName}>{team.name}</Text>
              <Text style={styles.teamRole}>{team.role}</Text>
            </View>
          ))}
        </View>
      )}

      {user.subscribedDataPacks && user.subscribedDataPacks.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subscribed Data Packs</Text>
          <Text style={styles.countText}>
            {user.subscribedDataPacks.length} data pack(s)
          </Text>
        </View>
      )}
    </View>
  );
};

interface InfoRowProps {
  label: string;
  value: string;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.label}>{label}:</Text>
    <Text style={styles.value}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#ffffff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666666',
    flex: 1,
  },
  value: {
    fontSize: 14,
    color: '#333333',
    flex: 2,
    textAlign: 'right',
  },
  permissionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  permission: {
    backgroundColor: '#007AFF',
    color: '#ffffff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    margin: 2,
    fontSize: 12,
  },
  teamItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  teamName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
    flex: 1,
  },
  teamRole: {
    fontSize: 12,
    color: '#666666',
    backgroundColor: '#e9ecef',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  countText: {
    fontSize: 14,
    color: '#666666',
    fontStyle: 'italic',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666666',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#dc3545',
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 5,
  },
});

export default UserProfile;