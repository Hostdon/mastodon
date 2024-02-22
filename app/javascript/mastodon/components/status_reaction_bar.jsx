import PropTypes from 'prop-types';
import React from 'react';

import { injectIntl } from 'react-intl';

import classNames from 'classnames';

import ImmutablePropTypes from 'react-immutable-proptypes';
import ImmutablePureComponent from 'react-immutable-pure-component';


import TransitionMotion from 'react-motion/lib/TransitionMotion';
import spring from 'react-motion/lib/spring';
import Overlay from 'react-overlays/Overlay';

import { AnimatedNumber } from 'mastodon/components/animated_number';
import unicodeMapping from 'mastodon/features/emoji/emoji_unicode_mapping_light';
import { autoPlayGif, reduceMotion } from 'mastodon/initial_state';
import { assetHost } from 'mastodon/utils/config';

import { Avatar } from './avatar';
import { DisplayName } from './display_name';

class Emoji extends React.PureComponent {

  static propTypes = {
    emoji: PropTypes.string.isRequired,
    emojiMap: ImmutablePropTypes.map.isRequired,
    hovered: PropTypes.bool.isRequired,
    domain: PropTypes.string,
    url: PropTypes.string,
    static_url: PropTypes.string,
  };

  render() {
    const { emoji, hovered, domain, url, static_url } = this.props;

    if (unicodeMapping[emoji]) {
      const { filename, shortCode } = unicodeMapping[this.props.emoji];
      const title = shortCode ? `:${shortCode}:` : '';

      return (
        <img
          draggable='false'
          className='emojione'
          alt={emoji}
          title={title}
          src={`${assetHost}/emoji/${filename}.svg`}
          loading='lazy'
          decoding='async'
        />
      );
    } else {
      const filename = (autoPlayGif || hovered) ? url : static_url;
      const shortCode = `:${emoji}:`;
      const title = domain ? `:${emoji}@${domain}:` : `:${emoji}:`;

      return (
        <img
          draggable='false'
          className='emojione custom-emoji'
          alt={shortCode}
          title={title}
          src={filename}
          loading='lazy'
          decoding='async'
        />
      );
    }
  }

}

class Reaction extends ImmutablePureComponent {

  static propTypes = {
    status: ImmutablePropTypes.map.isRequired,
    signedIn: PropTypes.bool.isRequired,
    reaction: ImmutablePropTypes.map.isRequired,
    addReaction: PropTypes.func.isRequired,
    removeReaction: PropTypes.func.isRequired,
    emojiMap: ImmutablePropTypes.map.isRequired,
    style: PropTypes.object,
    disabled: PropTypes.bool,
  };

  state = {
    hovered: false,
  };

  handleClick = () => {
    const { reaction, status, addReaction, removeReaction } = this.props;

    const shortCode = reaction.get('name');
    const domain = reaction.get('domain');

    const name = domain ? `${shortCode}@${domain}` : shortCode;

    if (reaction.get('me')) {
      removeReaction(status, name);
    } else {
      addReaction(status, name);
    }
  };

  handleMouseEnter = () => this.setState({ hovered: true });

  handleMouseLeave = () => this.setState({ hovered: false });

  setTargetRef = c => {
    this.target = c;
  };

  findTarget = () => {
    return this.target;
  };

  render() {
    const { reaction, signedIn } = this.props;
    const { hovered } = this.state;

    let shortCode = reaction.get('name');
    let title;

    const domain = reaction.get('domain');

    if (unicodeMapping[shortCode]) {
      shortCode = unicodeMapping[shortCode].shortCode;
      title = `:${shortCode}:`;
    } else {
      if (!domain || shortCode.endsWith(`@${domain}`)) {
        title = `:${shortCode}:`;
      } else {
        title = `${shortCode}@${domain}`;
      }
    }

    return (
      <>
        <span ref={this.setTargetRef} className='status-reaction-bar__wrapper' onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave}>
          <button className={classNames('status-reaction-bar__item', { active: reaction.get('me') })} disabled={!signedIn} onClick={this.handleClick} title={title} style={this.props.style}>
            <span className='status-reaction-bar__item__emoji'><Emoji hovered={hovered} emoji={reaction.get('name')} emojiMap={this.props.emojiMap} domain={reaction.get('domain')} url={reaction.get('url')} static_url={reaction.get('static_url')} signedIn={signedIn} /></span>
            <span className='status-reaction-bar__item__count'><AnimatedNumber value={reaction.get('count')} /></span>
          </button>
        </span>
        <Overlay show={hovered} offset={[0, 5]} placement={'top'} flip target={this.findTarget} popperConfig={{ strategy: 'fixed' }}>
          {({ props, placement }) => (
            <div {...props} >
              <div className={`dropdown-animation ${placement}`}>
                <div className='status-reaction-bar__item__users'>
                  <div className='status-reaction-bar__item__users__emoji'>
                    <span><Emoji hovered={this.state.hovered} emoji={reaction.get('name')} emojiMap={this.props.emojiMap} domain={reaction.get('domain')} url={reaction.get('url')} static_url={reaction.get('static_url')} signedIn={signedIn} /></span>
                    <span className='status-reaction-bar__item__users__emoji__code'>{title}</span>
                  </div>
                  <div>
                    {reaction.get('users').map(user => (
                      <span className='status-reaction-bar__item__users__item' key={user.get('acct')}>
                        <Avatar account={user} size={24} />
                        <DisplayName account={user} />
                      </span>
                    ))}
                    {reaction.get('count') > 11 && (
                      <span className='status-reaction-bar__item__users__item'>
                        +{reaction.get('count') - 11}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </Overlay>
      </>
    );
  }

}

class StatusReactionBar extends ImmutablePureComponent {

  static propTypes = {
    status: ImmutablePropTypes.map.isRequired,
    signedIn: PropTypes.bool.isRequired,
    addReaction: PropTypes.func.isRequired,
    removeReaction: PropTypes.func.isRequired,
    emojiMap: ImmutablePropTypes.map.isRequired,
  };

  willEnter() {
    return { scale: reduceMotion ? 1 : 0 };
  }

  willLeave() {
    return { scale: reduceMotion ? 0 : spring(0, { stiffness: 170, damping: 26 }) };
  }

  render() {
    const status = this.props.status;
    const signedIn = this.props.signedIn;

    const reactions = status.get('reactions');
    const visibleReactions = reactions.filter(x => x.get('count') > 0);

    const styles = visibleReactions.map(reaction => ({
      key: reaction.get('name') + '@' + reaction.get('domain'),
      data: reaction,
      style: { scale: reduceMotion ? 1 : spring(1, { stiffness: 150, damping: 13 }) },
    })).toArray();

    return (
      <TransitionMotion styles={styles} willEnter={this.willEnter} willLeave={this.willLeave}>
        {items => (
          <div className={classNames('status-reaction-bar', { 'status-reaction-bar--empty': visibleReactions.isEmpty() })}>
            {items.map(({ key, data, style }) => (
              <Reaction
                key={key}
                reaction={data}
                style={{ transform: `scale(${style.scale})`, position: style.scale < 0.5 ? 'absolute' : 'static' }}
                status={status}
                signedIn={signedIn}
                addReaction={this.props.addReaction}
                removeReaction={this.props.removeReaction}
                emojiMap={this.props.emojiMap}
              />
            ))}
          </div>
        )}
      </TransitionMotion>
    );
  }

}

export default injectIntl(StatusReactionBar);