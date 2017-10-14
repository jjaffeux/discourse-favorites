import { ajax } from 'discourse/lib/ajax';

const UNINITIALIZED = 0;
const LOADING = 1;
const LOADED = 2;

export default {

  /**
   * Array of favorite category IDs.
   *
   * @type {Set}
   */
  favorites: [],

  /**
   * State of favorites loading.
   *
   * @type {Integer}
   */
  state: UNINITIALIZED,

  /**
   * Queue of callbacks waiting for get().
   * This queue has elements [categoryId, callback(isFavorite)].
   *
   * @type {Array}
   */
  callbacks: [],

  /**
   * Constructs the favorites Set from the JSON response.
   *
   * @param {Array} favoritesResult
   */
  _setFavorites(favoritesResult) {
    this.favorites = new Set(favoritesResult.map(num => parseInt(num)));
    while (this.callbacks.length > 0) {
      let [categoryId, callback] = this.callbacks.pop();
      if (categoryId !== undefined) {
        callback(this.favorites.has(categoryId));
      } else {
        callback(Array.from(this.favorites));
      }
    }
    this.state = LOADED;
  },

  /**
   * Gets the favorite categories from the server.
   */
  _getFavorites() {

    // Favorites are already being loaded or were loaded.
    if (this.state !== UNINITIALIZED) {
      return;
    }

    // Load the favorites and then execute all callbacks in queue or try again
    // in the future.
    this.state = LOADING;
    ajax("/favorites/get").then(result => {
      this._setFavorites(result.favorites);
    }).catch((err) => {
      console.log("Error loading favorite categories.", err);
      this.state = UNINITIALIZED;
    });
  },

  /**
   * Sets the favorite categories list.
   *
   * @param {Array} categoryIds Array of category IDs.
   */
  set(categoryIds) {
    return ajax("/favorites/set", {
      type: "PUT",
      data: {
        category_ids: categoryIds
      }
    }).then(result => {
      this._setFavorites(result.favorites);
    }).catch(() => {
      console.log("Error setting favorite category.");
    });
  },

  /**
   * Adds a new category to the favorite categories.
   *
   * @param {Integer} categoryId Category ID.
   */
  add(categoryId) {
    return ajax("/favorites/add", {
      type: "PUT",
      data: {
        category_id: categoryId
      }
    }).then(result => {
      this._setFavorites(result.favorites);
    }).catch(() => {
      console.log("Error adding favorite category.");
    });
  },

  /**
   * Removes a category from the favorite categories.
   *
   * @param {Integer} categoryId Category ID.
   */
  remove(categoryId) {
    return ajax("/favorites/remove", {
      type: "PUT",
      data: {
        category_id: categoryId
      }
    }).then(result => {
      this._setFavorites(result.favorites);
    }).catch(() => {
      console.log("Error removing favorite category.");
    });
  },

  /**
   * Gets all favorite categories.
   *
   * @param  {Function} callback Callback to be called as soon as result is
   *                             available.
   */
  get(callback) {
    this.callbacks.push([undefined, callback]);
    this._getFavorites();
  },

  /**
   * Checks if a category is a favorite and calls the given callback.
   *
   * This function may call get() to retrieve the set of favorite categories.
   *
   * @param  {Integer}  categoryId Category ID.
   * @param  {Function} callback   Callback to be called as soon as result is
   *                               available.
   */
  isFavorite(categoryId, callback) {
    if (this.state == LOADED) {
      callback(this.favorites.has(categoryId));
      return;
    }

    this.callbacks.push([categoryId, callback]);
    this._getFavorites();
  },
};
