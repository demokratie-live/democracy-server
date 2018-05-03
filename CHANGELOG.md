# Changelog

### 0.1.7

* graphQL
  * always import the correct voteDate for Anträge & Gesetze

### 0.1.6

* graphQL
  * Include "Abgelehnt" and "Angenommen" in Voting-List & unified procedureState definition [#306](https://github.com/demokratie-live/democracy-client/issues/306)
* Resync with bundestag.io on procedures gte 19
* Parameterized the period to be displayed/used

### 0.1.5

* pushNotifications
  * Disabled pushNotifications due to non-functionality

### 0.1.4

* graphQL
  * Procedure resolver: procedures
    * Fix order ( first votedate and add by last update ) [#280](https://github.com/demokratie-live/democracy-client/issues/280)
