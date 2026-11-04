from surimi.v1 import fleet_segment_pb2 as _fleet_segment_pb2
from google.protobuf.internal import containers as _containers
from google.protobuf import descriptor as _descriptor
from google.protobuf import message as _message
from collections.abc import Iterable as _Iterable, Mapping as _Mapping
from typing import ClassVar as _ClassVar, Optional as _Optional, Union as _Union

DESCRIPTOR: _descriptor.FileDescriptor

class FishingActivity(_message.Message):
    __slots__ = ("fleet_segment", "fishing_activity_ratio")
    FLEET_SEGMENT_FIELD_NUMBER: _ClassVar[int]
    FISHING_ACTIVITY_RATIO_FIELD_NUMBER: _ClassVar[int]
    fleet_segment: _fleet_segment_pb2.FleetSegment
    fishing_activity_ratio: float
    def __init__(self, fleet_segment: _Optional[_Union[_fleet_segment_pb2.FleetSegment, _Mapping]] = ..., fishing_activity_ratio: _Optional[float] = ...) -> None: ...

class FishingActivitySummary(_message.Message):
    __slots__ = ("fishing_activities",)
    FISHING_ACTIVITIES_FIELD_NUMBER: _ClassVar[int]
    fishing_activities: _containers.RepeatedCompositeFieldContainer[FishingActivity]
    def __init__(self, fishing_activities: _Optional[_Iterable[_Union[FishingActivity, _Mapping]]] = ...) -> None: ...
