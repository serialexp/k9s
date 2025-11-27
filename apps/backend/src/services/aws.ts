import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { parse as parseINI } from 'ini';
import { EKSClient, ListClustersCommand, DescribeClusterCommand } from '@aws-sdk/client-eks';
import { fromIni } from '@aws-sdk/credential-providers';
import { execSync } from 'child_process';

export interface AwsProfile {
  name: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
  region?: string;
}

export interface EksCluster {
  name: string;
  status: string;
  version: string;
  endpoint: string;
  region: string;
}

const AWS_REGIONS = [
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'ap-northeast-1',
  'ap-northeast-2',
  'ap-southeast-1',
  'ap-southeast-2',
  'ap-south-1',
  'eu-west-1',
  'eu-west-2',
  'eu-central-1',
  'ca-central-1',
  'sa-east-1'
];

export class AwsService {
  getAwsProfiles(): AwsProfile[] {
    try {
      const credentialsPath = join(homedir(), '.aws', 'credentials');
      const credentialsContent = readFileSync(credentialsPath, 'utf-8');

      // Parse manually to preserve profile names with dots
      const profiles: AwsProfile[] = [];
      const lines = credentialsContent.split('\n');
      let currentProfile: string | null = null;
      let currentConfig: any = {};

      for (const line of lines) {
        const trimmed = line.trim();

        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) {
          continue;
        }

        // Check for profile section headers [profile-name]
        const sectionMatch = trimmed.match(/^\[([^\]]+)\]$/);
        if (sectionMatch) {
          // Save previous profile if exists
          if (currentProfile && Object.keys(currentConfig).length > 0) {
            profiles.push({
              name: currentProfile,
              accessKeyId: currentConfig.aws_access_key_id,
              secretAccessKey: currentConfig.aws_secret_access_key,
              sessionToken: currentConfig.aws_session_token,
              region: currentConfig.region
            });
          }

          // Start new profile
          currentProfile = sectionMatch[1];
          currentConfig = {};
          continue;
        }

        // Check for key=value pairs
        const keyValueMatch = trimmed.match(/^([^=]+)=(.*)$/);
        if (keyValueMatch && currentProfile) {
          const key = keyValueMatch[1].trim();
          const value = keyValueMatch[2].trim();
          currentConfig[key] = value;
        }
      }

      // Don't forget the last profile
      if (currentProfile && Object.keys(currentConfig).length > 0) {
        profiles.push({
          name: currentProfile,
          accessKeyId: currentConfig.aws_access_key_id,
          secretAccessKey: currentConfig.aws_secret_access_key,
          sessionToken: currentConfig.aws_session_token,
          region: currentConfig.region
        });
      }

      return profiles;
    } catch (error) {
      throw new Error(`Failed to read AWS credentials: ${(error as Error).message}`);
    }
  }

  getAwsRegions(): string[] {
    return AWS_REGIONS;
  }

  async listEksClusters(region: string, profile: string): Promise<EksCluster[]> {
    try {
      // Create EKS client with profile credentials using AWS SDK credential provider
      const eksClient = new EKSClient({
        region,
        credentials: fromIni({
          profile,
          filepath: join(homedir(), '.aws', 'credentials'),
          configFilepath: join(homedir(), '.aws', 'config')
        })
      });

      const listCommand = new ListClustersCommand({});
      const listResponse = await eksClient.send(listCommand);

      const clusters: EksCluster[] = [];

      if (listResponse.clusters) {
        for (const clusterName of listResponse.clusters) {
          try {
            const describeCommand = new DescribeClusterCommand({ name: clusterName });
            const describeResponse = await eksClient.send(describeCommand);

            if (describeResponse.cluster) {
              clusters.push({
                name: describeResponse.cluster.name || clusterName,
                status: describeResponse.cluster.status || 'UNKNOWN',
                version: describeResponse.cluster.version || 'unknown',
                endpoint: describeResponse.cluster.endpoint || '',
                region
              });
            }
          } catch (error) {
            console.warn(`Failed to describe cluster ${clusterName}:`, error);
          }
        }
      }

      return clusters;
    } catch (error) {
      throw new Error(`Failed to list EKS clusters: ${(error as Error).message}`);
    }
  }

  async importEksCluster(clusterName: string, region: string, profile: string): Promise<void> {
    try {
      const command = `aws eks update-kubeconfig --region ${region} --name ${clusterName} --profile ${profile}`;
      execSync(command, { stdio: 'pipe' });
    } catch (error) {
      throw new Error(`Failed to import EKS cluster: ${(error as Error).message}`);
    }
  }
}