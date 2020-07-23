pragma solidity 0.5.16;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/ownership/Ownable.sol";
import "./interfaces/IGTRXCertifiableToken.sol";
import "./library/BasisPoints.sol";


contract GTRXDaoLock is Initializable, Ownable {
    using BasisPoints for uint;
    using SafeMath for uint;

    uint public releaseInterval;
    uint public releaseStart;
    uint public releaseBP;

    uint public startingGTRX;
    uint public claimedGTRX;

    IGTRXCertifiableToken private GTRXToken;

    address daoWallet;

    modifier onlyAfterStart {
        require(releaseStart != 0 && now > releaseStart, "Has not yet started.");
        _;
    }

    function initialize(
        uint _releaseInterval,
        uint _releaseBP,
        address owner,
        IGTRXCertifiableToken _GTRXToken
    ) external initializer {
        releaseInterval = _releaseInterval;
        releaseBP = _releaseBP;
        GTRXToken = _GTRXToken;

        Ownable.initialize(msg.sender);

        //Due to issue in oz testing suite, the msg.sender might not be owner
        _transferOwnership(owner);
    }

    function claimGTRX() external onlyAfterStart {
        require(releaseStart == 0, "Has already started.");
        uint cycle = getCurrentCycleCount();
        uint totalClaimAmount = cycle.mul(startingGTRX.mulBP(releaseBP));
        uint toClaim = totalClaimAmount.sub(claimedGTRX);
        if (GTRXToken.balanceOf(address(this)) < toClaim) toClaim = GTRXToken.balanceOf(address(this));
        claimedGTRX = claimedGTRX.add(toClaim);
        GTRXToken.transfer(daoWallet, toClaim);
    }

    function startRelease(address _daoWallet) external onlyOwner {
        require(releaseStart == 0, "Has already started.");
        require(GTRXToken.balanceOf(address(this)) != 0, "Must have some GTRX deposited.");
        daoWallet = _daoWallet;
        startingGTRX = GTRXToken.balanceOf(address(this));
        releaseStart = now.add(24 hours);
    }

    function getCurrentCycleCount() public view returns (uint) {
        if (now <= releaseStart) return 0;
        return now.sub(releaseStart).div(releaseInterval).add(1);
    }

}
