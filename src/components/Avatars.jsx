import React from 'react';
import UserAvatar from './UserAvatar';

export function getAvatarSvg(avatar, size = 36, name = 'Student') {
    return <UserAvatar avatar={avatar} size={size} name={name} />;
}

export default UserAvatar;

