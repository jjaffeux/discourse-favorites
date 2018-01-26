import buildTopicRoute from 'discourse/routes/build-topic-route';
import DiscoverySortableController from 'discourse/controllers/discovery-sortable';
import { customNavItemHref } from 'discourse/models/nav-item';
import { withPluginApi } from 'discourse/lib/plugin-api';
import { iconHTML } from 'discourse-common/lib/icon-library';

function buildFavoriteRoute(filter) {
  return buildTopicRoute('favorites/' + filter, {
    beforeModel() {
      this.controllerFor('navigation/default').set('filterMode', filter);
    }
  });
}

export default {
  name: "favorites-routes",

  initialize(container) {
    withPluginApi('0.8.17', api => {
      api.modifySelectKit(["category-drop"])
         .modifyCollectionHeader((context, content) => {
           content += `
            <a href="/favorites" class="category-filter">
              ${iconHTML('star')}
              ${I18n.t('favorites.category')}
            </a>
           `;
           return content;
         });
    });

    /**
     * This feature is available only to logged users.
     */
    const currentUser = container.lookup('current-user:main');
    if (!currentUser) {
      return;
    }

    /**
     * Create controllers for favorites.
     */
    Discourse[`DiscoveryFavoritesController`] = DiscoverySortableController.extend();
    Discourse[`DiscoveryFavoritesRoute`] = buildFavoriteRoute('latest');

    Discourse.Site.current().get('filters').forEach(filter => {
      const filterCapitalized = filter.capitalize();
      Discourse[`Discovery${filterCapitalized}FavoritesController`] = DiscoverySortableController.extend();
      Discourse[`Discovery${filterCapitalized}FavoritesRoute`] = buildFavoriteRoute(filter);
    });

    /**
     * Overwrite filter URLs from the navigation bar.
     */
    customNavItemHref(function(navItem) {
      if (['latest', 'new', 'unread'].includes(navItem.get('name')) && container.lookup('router:main').get('currentURL').startsWith('/favorites/')) {
        return '/favorites/' + navItem.get('name');
      }
      return null;
    });
  }
};
