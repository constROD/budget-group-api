import { type DbClient } from '@/db/create-db-client';
import { makeDefaultDataListReturn } from '../make-default-list-return';

export type SearchGroupExpensesFilters = {
  searchText?: string;
  dateRange?: {
    startDate?: string;
    endDate?: string;
  };
};

export type SearchGroupExpensesDataArgs = {
  dbClient: DbClient;
  groupId: string;
  limit?: number;
  page?: number;
  orderBy?: 'asc' | 'desc';
  includeArchived?: boolean;
  filters?: SearchGroupExpensesFilters;
};

export async function searchGroupExpensesData({
  dbClient,
  groupId,
  limit = 25,
  page = 1,
  orderBy = 'desc',
  includeArchived = false,
  filters,
}: SearchGroupExpensesDataArgs) {
  let baseQuery = dbClient.selectFrom('group_expenses').where('group_id', '=', groupId);

  if (!includeArchived) {
    baseQuery = baseQuery.where('deleted_at', 'is', null);
  }

  if (filters?.searchText) {
    const searchText = `%${filters.searchText}%`;
    baseQuery = baseQuery.where(eb => {
      return eb.or([eb('description', 'ilike', searchText), eb('tag', 'ilike', searchText)]);
    });
  }

  if (filters?.dateRange?.startDate) {
    const startDate = new Date(filters.dateRange.startDate);
    if (!isNaN(startDate.getTime())) {
      baseQuery = baseQuery.where('expense_date', '>=', startDate);
    }
  }

  if (filters?.dateRange?.endDate) {
    const endDate = new Date(filters.dateRange.endDate);
    if (!isNaN(endDate.getTime())) {
      baseQuery = baseQuery.where('expense_date', '<=', endDate);
    }
  }

  const records = await baseQuery
    .selectAll()
    .limit(limit)
    .offset((page - 1) * limit)
    .orderBy('created_at', orderBy)
    .execute();

  const totalCountQuery = dbClient.selectFrom('group_expenses').where('group_id', '=', groupId);

  if (!includeArchived) {
    totalCountQuery.where('deleted_at', 'is', null);
  }

  if (filters?.searchText) {
    const searchText = `%${filters.searchText}%`;
    totalCountQuery.where(eb => {
      return eb.or([eb('description', 'ilike', searchText), eb('tag', 'ilike', searchText)]);
    });
  }

  if (filters?.dateRange?.startDate) {
    const startDate = new Date(filters.dateRange.startDate);
    if (!isNaN(startDate.getTime())) {
      totalCountQuery.where('expense_date', '>=', startDate);
    }
  }

  if (filters?.dateRange?.endDate) {
    const endDate = new Date(filters.dateRange.endDate);
    if (!isNaN(endDate.getTime())) {
      totalCountQuery.where('expense_date', '<=', endDate);
    }
  }

  const totalCount = await totalCountQuery
    .select(eb => eb.fn.count('id').as('total_records'))
    .executeTakeFirst();

  const count = Number(totalCount?.total_records) ?? 0;

  return makeDefaultDataListReturn({
    records,
    totalRecords: count,
    limit,
    page,
  });
}

export type SearchGroupExpensesDataResponse = Awaited<ReturnType<typeof searchGroupExpensesData>>;
