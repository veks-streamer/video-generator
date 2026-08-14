import type { VideoResult } from "./constants";
import { formatCredits, assetId } from "./constants";

const PLACEHOLDER_IMAGE =
  "https://upload.wikimedia.org/wikipedia/commons/thumb/a/aa/Philips_PM5544.svg/1280px-Philips_PM5544.svg.png";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Build a VOD XML document for one generated video (flat "movie" template).
 * `assetID` (= the video/thumbnail/xml filename stem) fills originalTitle and
 * title; the description carries the extracted list of video + music authors.
 */
export function buildVodXml(r: VideoResult): string {
  const assetID = esc(assetId(r));
  const year = (() => {
    const y = new Date(r.createdAt).getFullYear();
    return Number.isFinite(y) ? y : 2026;
  })();
  const authorList = r.credits ? formatCredits(r.credits).trimEnd() : "No credits available.";
  // Series description: label line + the extracted author list.
  const seriesDesc = esc(`Opis\n${authorList}`);

  return `<vod>
        <active>false</active>
        <contentRating>0</contentRating>
        <credits>
                <actor></actor>
                <actor></actor>
                <director></director>
                <writer></writer>
                <producer></producer>
                <editor></editor>
                <project_editor></project_editor>
                <photographer></photographer>
                <screenplay></screenplay>
                <author></author>
        </credits>
        <description>
                <description lang="hr">${seriesDesc}</description>
        </description>
        <image_landscape>${PLACEHOLDER_IMAGE}</image_landscape> <!--vanjski dostupan http/s url-->
        <image_portrait>${PLACEHOLDER_IMAGE}</image_portrait> <!--vanjski dostupan http/s url-->
        <epizode_number>0</epizode_number>
        <geoblocked>true</geoblocked>
        <geoblocke_rule>EU</geoblocke_rule>
        <originalTitle>${assetID}</originalTitle>
        <production_countries>Hrvatska</production_countries>
        <production_year>${year}</production_year>
        <publisher></publisher>
        <titles>
                <title lang="hr">${assetID}</title>
        </titles>
        <type>movie</type>
</vod>
`;
}
