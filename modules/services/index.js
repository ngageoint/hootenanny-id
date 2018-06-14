import serviceMapillary from './mapillary';
import serviceNominatim from './nominatim';
import serviceOpenstreetcam from './openstreetcam';
import serviceOsm from './osm';
import serviceStreetside from './streetside';
import serviceTaginfo from './taginfo';
import serviceWikidata from './wikidata';
import serviceWikipedia from './wikipedia';

import serviceHoot from './hoot';

export var services = {
    geocoder: serviceNominatim,
    mapillary: serviceMapillary,
    openstreetcam: serviceOpenstreetcam,
    osm: serviceOsm,
    streetside: serviceStreetside,
    taginfo: serviceTaginfo,
    wikidata: serviceWikidata,
    wikipedia: serviceWikipedia,
    hoot: serviceHoot
};

export {
    serviceMapillary,
    serviceNominatim,
    serviceOpenstreetcam,
    serviceOsm,
    serviceStreetside,
    serviceTaginfo,
    serviceWikidata,
    serviceWikipedia
};
