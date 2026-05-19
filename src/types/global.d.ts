// Global type declarations for external libraries

declare namespace google {
    export namespace maps {
        export class Geocoder {
            constructor();
            geocode(request: any, callback: (results: any, status: string) => void): void;
        }
        export class PlacesService {
            constructor(container: HTMLElement);
            textSearch(request: any, callback: (results: any, status: string) => void): void;
            getDetails(request: any, callback: (place: any, status: string) => void): void;
            nearbySearch(request: any, callback: (results: any, status: string) => void): void;
        }
        export class DistanceMatrixService {
            constructor();
            getDistanceMatrix(request: any, callback: (response: any, status: string) => void): void;
        }
        export enum TravelMode { DRIVING = "DRIVING" }
        export enum UnitSystem { METRIC = "METRIC" }
        export namespace places {
            export const PlacesServiceStatus: { OK: string };
            export class Autocomplete {
                constructor(inputField: HTMLInputElement, options?: any);
                addListener(eventName: string, handler: Function): void;
                getPlace(): any;
            }
        }
    }
}

declare interface Window {
    FB?: any; // Facebook SDK global
    google?: any; // Google Identity Services
    AppleID?: any; // Apple Sign In
}

declare module "*.mpeg" {
    const src: string;
    export default src;
}
