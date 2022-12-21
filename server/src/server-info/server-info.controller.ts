import { Controller, Get } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { oauth2ProviderNamesMap } from '../oauth2/oauth2-common';
import OAuth2Service from '../oauth2/oauth2.service';
import ServerInfoResponse from './server-info-response';

@Controller('server-info')
export default class ServerInfoController {
  private readonly oauth2ProviderSupport: ServerInfoResponse;

  constructor(oauth2Service: OAuth2Service) {
    this.oauth2ProviderSupport = {} as ServerInfoResponse;
    for (const [providerType, providerName] of Object.entries(
      oauth2ProviderNamesMap,
    )) {
      this.oauth2ProviderSupport[
        (providerName.toLowerCase() +
          'OAuth2IsSupported') as keyof ServerInfoResponse
      ] = oauth2Service.providerIsSupported(+providerType);
    }
  }

  @ApiOperation({
    summary: 'Get server info',
    description:
      'Get the server information, including which features are supported.',
    operationId: 'getServerInfo',
  })
  @Get()
  getServerInfo(): ServerInfoResponse {
    return this.oauth2ProviderSupport;
  }
}
