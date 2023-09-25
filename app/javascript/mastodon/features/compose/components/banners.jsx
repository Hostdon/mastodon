// CUSTOMIZE
import React from 'react';
import Immutable from 'immutable';
import Link from 'react-router-dom/Link';
import PropTypes from 'prop-types';
import { injectIntl } from 'react-intl';
import ichikuraBanner from '../../../../images/ichikura_banner.png';
import ichicradioBanner from '../../../../images/ichicradio_banner.png';

@injectIntl
export default class Banners extends React.PureComponent {

  static propTypes = {
    intl: PropTypes.object.isRequired,
  };

  componentWillMount () {
    const banners = [];

    banners.push(
      {
        key: 1,
        name: 'ichikura',
        image_url: ichikuraBanner,
        link: 'http://tomatosumisow.noor.jp/ichikura.html',
      },
      {
        key: 2,
        name: 'ichicradio',
        image_url: ichicradioBanner,
        link: 'https://complementaryparty.wixsite.com/ichiradi',
      },
    );

    this.banners = Immutable.fromJS(banners);
  }

  render () {
    // const { intl } = this.props; // i18n
    return (
      <div className='drawer__banners'>
        <ul>
          {this.banners.map(banner => (
            <li className='drawer__banner' key={banner.get('key')}>
              <a href={banner.get('link')} target='_blank'>
                <img src={banner.get('image_url')} alt={banner.get('name')} />
              </a>
            </li>
          ))}
        </ul>
      </div>
    );
  }

};
