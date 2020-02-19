import { Injectable } from '@angular/core';
import { Resolve, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs/Observable';

import 'rxjs/add/operator/switchMap';

import * as _ from 'lodash';

import { SearchService } from 'app/services/search.service';

@Injectable()
export class DocumentsResolver implements Resolve<Observable<object>> {
  private milestones: any[] = [];
  private authors: any[] = [];
  private types: any[] = [];

  private filterForAPI: object = {};

  constructor(
    private searchService: SearchService
  ) { }

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<object> {
    const projectId = route.parent.paramMap.get('projId');
    const currentPage = route.params.currentPage ? route.params.currentPage : 1;
    const pageSize = route.params.pageSize ? route.params.pageSize : 10;
    const sortBy = route.params.sortBy && route.params.sortBy !== 'null' ? route.params.sortBy : '-datePosted';
    const datePostedStart = route.params.hasOwnProperty('datePostedStart') &&  route.params.datePostedStart ? route.params.datePostedStart : null;
    const datePostedEnd = route.params.hasOwnProperty('datePostedEnd') && route.params.datePostedEnd ? route.params.datePostedEnd : null;
    const keywords = route.params.keywords;

    // Get the lists first
    return this.searchService.getFullList('List')
      .switchMap((res: any) => {
        if (res.length > 0) {
          res[0].searchResults.map(item => {
            switch (item.type) {
              case 'label':
                this.milestones.push({ ...item });
                break;
              case 'author':
                this.authors.push({ ...item });
                break;
              case 'doctype':
                this.types.push({ ...item });
                break;
              default:
                break;
            }
          });
        }

        // Validate the filter parameters being sent to the API
        this.setFilterFromParams(route.params);

        let queryModifiers = { documentSource: 'PROJECT' };

        if (datePostedStart !== null && datePostedEnd !== null) {
          queryModifiers['datePostedStart'] = datePostedStart;
          queryModifiers['datePostedEnd'] = datePostedEnd;
        }

        return this.searchService.getSearchResults(
          keywords,
          'Document',
          [{ 'name': 'project', 'value': projectId }],
          currentPage,
          pageSize,
          sortBy,
          queryModifiers,
          true,
          null,
          this.filterForAPI,
          '');
      });
  }

  paramsToCollectionFilter(params, name, collection, identifyBy) {
    delete this.filterForAPI[name];

    if (params[name] && collection) {
      let confirmedValues = [];
      // look up each value in collection
      const values = params[name].split(',');
      values.forEach(value => {
        const record = _.find(collection, [ identifyBy, value ]);
        if (record) {
          confirmedValues.push(value);
        }
      });
      if (confirmedValues.length) {
        this.filterForAPI[name] = confirmedValues.join(',');
      }
    }
  }

  paramsToDateFilter(params, name) {
    delete this.filterForAPI[name];

    if (params[name]) {
      this.filterForAPI[name] = params[name];
    }
  }

  setFilterFromParams(params) {
    this.paramsToCollectionFilter(params, 'milestone', this.milestones, '_id');
    this.paramsToCollectionFilter(params, 'documentAuthorType', this.authors, '_id');
    this.paramsToCollectionFilter(params, 'type', this.types, '_id');
  }
}
