import { Brackets, SelectQueryBuilder } from 'typeorm';
import { FindAllQuery } from '../common/dto/find-all-query.dto';

export interface QueryBuilderConfig {
  searchableFields: string[];
  allowedRelations: string[];
}

export function applyQueryFilters<T>(
  qb: SelectQueryBuilder<any>,
  query: FindAllQuery<T>,
  config: QueryBuilderConfig,
) {
  const { searchableFields = [], allowedRelations: validRelations = [] } = config;
  const alias = qb.alias;
  if (query.relations) {
    const relations = Array.isArray(query.relations) ? query.relations : [query.relations];

    relations.forEach((rel: string) => {
      if (!validRelations.includes(rel)) return;

      if (rel.includes('.')) {
        const [parent, child] = rel.split('.');

        const isParentJoined = qb.expressionMap.aliases.some((a) => a.name === parent);
        if (!isParentJoined) {
          qb.leftJoinAndSelect(`${alias}.${parent}`, parent);
        }

        const childAlias = `${parent}_${child}`;
        const isChildJoined = qb.expressionMap.aliases.some((a) => a.name === childAlias);
        if (!isChildJoined) {
          qb.leftJoinAndSelect(`${parent}.${child}`, childAlias);
        }
      } else {
        const isJoined = qb.expressionMap.aliases.some((a) => a.name === rel);
        if (!isJoined) {
          qb.leftJoinAndSelect(`${alias}.${rel}`, rel);
        }
      }
    });
  }

  if (query.where) {
    Object.keys(query.where).forEach((key) => {
      const value = (query.where as any)[key];
      if (value === undefined || value === null) return;

      if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        const relationAlias = key;

        const isJoined = qb.expressionMap.aliases.some((a) => a.name === relationAlias);
        if (!isJoined) {
          qb.leftJoin(`${alias}.${key}`, relationAlias);
        }

        Object.keys(value).forEach((subKey) => {
          const subValue = value[subKey];
          if (subValue !== undefined) {
            const paramName = `${relationAlias}_${subKey}_${Math.random().toString(36).substring(7)}`;
            qb.andWhere(`${relationAlias}.${subKey} = :${paramName}`, { [paramName]: subValue });
          }
        });
      } else {
        const paramName = `${alias}_${key}`;
        qb.andWhere(`${alias}.${key} = :${paramName}`, { [paramName]: value });
      }
    });
  }

  if (query.search && searchableFields.length > 0) {
    qb.andWhere(
      new Brackets((subQb) => {
        searchableFields.forEach((field) => {
          subQb.orWhere(`${alias}.${field} ILIKE :search`, { search: `%${query.search}%` });
        });
      }),
    );
  }

  if (query.order) {
    Object.keys(query.order).forEach((key) => {
      qb.addOrderBy(`${alias}.${key}`, (query.order as any)[key] as 'ASC' | 'DESC');
    });
  }

  if (query.take !== undefined) qb.take(query.take);
  if (query.skip !== undefined) qb.skip(query.skip);

  return qb;
}
