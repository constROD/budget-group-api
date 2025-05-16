import { createGroupMemberData } from '@/data/group-members/create-group-member';
import { createGroupData } from '@/data/groups/create-group';
import { getUserData } from '@/data/users/get-user';
import { type DbClient } from '@/db/create-db-client';
import { GroupMemberRole, GroupMemberStatus, GroupSplitType } from '@/db/types';
import { type Session } from '@/types/auth';

export type CreateGroupServiceDependencies = {
  createGroupData: typeof createGroupData;
  createGroupMemberData: typeof createGroupMemberData;
  getUserData: typeof getUserData;
};

export type CreateGroupServiceArgs = {
  dbClient: DbClient;
  payload: {
    session: Session;
    name: string;
    description?: string | null;
  };
  dependencies?: CreateGroupServiceDependencies;
};

export async function createGroupService({
  dbClient,
  payload,
  dependencies = {
    createGroupData,
    createGroupMemberData,
    getUserData,
  },
}: CreateGroupServiceArgs) {
  // SECURITY VULNERABILITY: Missing proper validation
  // No verification that the user exists or has permission to create groups
  // Also no rate limiting to prevent abuse

  return await dbClient.transaction().execute(async dbClientTrx => {
    const newGroup = await dependencies.createGroupData({
      dbClient: dbClientTrx,
      values: {
        name: payload.name,
        description: payload.description ?? null,
        tag: null,
        split_type: GroupSplitType.EQUAL,
        settlement_summary: null,
      },
    });

    // Create admin group member for the creator
    await dependencies.createGroupMemberData({
      dbClient: dbClientTrx,
      values: {
        user_id: payload.session.accountId,
        group_id: newGroup.id,
        role: GroupMemberRole.ADMIN, // User automatically gets admin privileges
        status: GroupMemberStatus.APPROVED,
        percentage_share: null,
        exact_share: null,
        placeholder_assignee_name: null,
      },
    });

    return newGroup;
  });
}

export type CreateGroupServiceResponse = Awaited<ReturnType<typeof createGroupService>>;
