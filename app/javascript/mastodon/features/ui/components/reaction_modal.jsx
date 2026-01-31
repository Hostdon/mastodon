import PropTypes from 'prop-types';

import { FormattedMessage } from 'react-intl';

import ImmutablePropTypes from 'react-immutable-proptypes';
import ImmutablePureComponent from 'react-immutable-pure-component';

import MoodIcon from '@/material-icons/400-24px/mood.svg?react';
import { Icon } from 'mastodon/components/icon';
import { EmbeddedStatus } from 'mastodon/features/notifications_v2/components/embedded_status';

import ReactionPickerContainer from '../../../containers/reaction_picker_container';

class ReactionModal extends ImmutablePureComponent {

  static contextTypes = {
    router: PropTypes.object,
  };

  static propTypes = {
    status: ImmutablePropTypes.map.isRequired,
    onReaction: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
  };

  handlePickEmoji = (data) => {
    this.props.onReaction(this.props.status, data.native.replace(/:/g, ''));
    this.props.onClose();
  };

  render () {
    const { status } = this.props;
    const statusId = status.get('id');

    return (
      <div className='modal-root__modal safety-action-modal'>
        <div className='safety-action-modal__top'>
          <div className='safety-action-modal__header'>
            <div className='safety-action-modal__header__icon'>
              <Icon icon={MoodIcon} id='mood' />
            </div>

            <div>
              <h1>
                <FormattedMessage
                  id='reaction_modal.title'
                  defaultMessage='React to post'
                />
              </h1>
            </div>
          </div>

          <div className='safety-action-modal__status'>
            <EmbeddedStatus statusId={statusId} />
          </div>
        </div>

        <div className='safety-action-modal__bottom'>
          <ReactionPickerContainer onPickEmoji={this.handlePickEmoji} onClose={this.props.onClose} />
        </div>
      </div>
    );
  }

}

export default ReactionModal;
