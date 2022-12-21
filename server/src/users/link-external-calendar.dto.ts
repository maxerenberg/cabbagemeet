import { OmitType } from '@nestjs/swagger';
import OAuth2ConsentPostRedirectDto from '../oauth2/oauth2-consent-post-redirect.dto';

export default class LinkExternalCalendarDto extends OmitType(
  OAuth2ConsentPostRedirectDto,
  ['nonce'],
) {}
